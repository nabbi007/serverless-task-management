import React from 'react';

const Team = () => {
  return (
    <div className="team-page">
      <div className="page-top">
        <div>
          <h1 className="page-title">Team Members</h1>
          <p className="page-subtitle">Team management coming soon</p>
        </div>
      </div>

      <div className="empty-message">
        Team member management feature is under development.
        <br />
        You can assign tasks to members by their email address when creating tasks.
      </div>
    </div>
  );
};

export default Team;
