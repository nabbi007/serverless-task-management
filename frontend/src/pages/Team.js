import React from 'react';

const Team = () => {
  return (
    <div className="team-page">
      <div className="page-top">
        <div>
          <h1 className="page-title">Team Members</h1>
          <p className="page-subtitle">Contact your administrator to view team members</p>
        </div>
      </div>

      <div className="empty-message">
        Team member listing requires additional AWS permissions.
        <br />
        Please check CloudWatch logs or contact your system administrator.
      </div>
    </div>
  );
};

export default Team;
