import React, { useEffect, useMemo, useRef, useState } from 'react';

const MultiMemberSelect = ({
  users = [],
  selectedUserIds = [],
  onChange,
  placeholder = 'Select members',
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds]);

  const normalizedUsers = useMemo(
    () =>
      users.filter(Boolean).map((user) => ({
        userId: user.userId,
        email: user.email || '',
        name: user.name || 'Member'
      })),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return normalizedUsers;

    return normalizedUsers.filter((user) => {
      const emailMatch = user.email.toLowerCase().includes(normalizedSearch);
      const nameMatch = user.name.toLowerCase().includes(normalizedSearch);
      return emailMatch || nameMatch;
    });
  }, [normalizedUsers, searchTerm]);

  const selectedUsers = useMemo(
    () => normalizedUsers.filter((user) => selectedSet.has(user.userId)),
    [normalizedUsers, selectedSet]
  );

  const summaryLabel = useMemo(() => {
    if (selectedUsers.length === 0) return placeholder;
    if (selectedUsers.length === 1) return selectedUsers[0].email;
    if (selectedUsers.length === 2) return `${selectedUsers[0].email}, ${selectedUsers[1].email}`;
    return `${selectedUsers.length} members selected`;
  }, [selectedUsers, placeholder]);

  const toggleUser = (userId) => {
    if (!onChange) return;
    if (selectedSet.has(userId)) {
      onChange(selectedUserIds.filter((id) => id !== userId));
      return;
    }
    onChange([...selectedUserIds, userId]);
  };

  const selectAllFiltered = () => {
    if (!onChange) return;
    const merged = new Set(selectedUserIds);
    filteredUsers.forEach((user) => merged.add(user.userId));
    onChange(Array.from(merged));
  };

  const clearSelection = () => {
    if (!onChange) return;
    onChange([]);
  };

  return (
    <div className={`member-multiselect ${disabled ? 'is-disabled' : ''}`} ref={containerRef}>
      <button
        type="button"
        className="member-multiselect-trigger"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span className="member-multiselect-label">{summaryLabel}</span>
        <span className={`member-multiselect-caret ${open ? 'is-open' : ''}`}>v</span>
      </button>

      {open && !disabled && (
        <div className="member-multiselect-panel">
          <div className="member-multiselect-panel-head">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by email or name"
              className="member-multiselect-search"
            />
            <div className="member-multiselect-actions">
              <button
                type="button"
                className="member-multiselect-link"
                onClick={selectAllFiltered}
                disabled={filteredUsers.length === 0}
              >
                Select all
              </button>
              <button
                type="button"
                className="member-multiselect-link"
                onClick={clearSelection}
                disabled={selectedUserIds.length === 0}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="member-multiselect-options">
            {filteredUsers.length === 0 && (
              <div className="member-multiselect-empty">No members found.</div>
            )}

            {filteredUsers.map((user) => (
              <label key={user.userId} className="member-multiselect-option">
                <input
                  type="checkbox"
                  checked={selectedSet.has(user.userId)}
                  onChange={() => toggleUser(user.userId)}
                />
                <span className="member-option-avatar">
                  {(user.email || user.name || 'M').substring(0, 2).toUpperCase()}
                </span>
                <span className="member-option-meta">
                  <span className="member-option-email">{user.email}</span>
                  <span className="member-option-name">{user.name}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiMemberSelect;
