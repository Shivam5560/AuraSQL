import React from 'react';

export function DeveloperInfo() {
  return (
    <div className="developer-info p-6 bg-card rounded-lg shadow-md">
      <h3 className="text-2xl font-semibold mb-2">Shivam Sourav</h3>
      <p className="developer-title text-muted-foreground mb-4">Associate Software Engineer</p>
      <p className="developer-description text-lg mb-6">Associate Software Engineer at NRI Fintech India, passionate about creating tools that help professionals advance their careers through better resume presentation.</p>
      <div className="developer-details space-y-2 mb-6">
        <div className="detail-item flex items-center">
          <span className="detail-label font-medium w-32 text-foreground">Current Role:</span>
          <span className="text-muted-foreground">Associate Software Engineer at NRI Fintech India</span>
        </div>
        <div className="detail-item flex items-center">
          <span className="detail-label font-medium w-32 text-foreground">Education:</span>
          <span className="text-muted-foreground">B.Tech AI & Data Science, SMIT</span>
        </div>
        <div className="detail-item flex items-center">
          <span className="detail-label font-medium w-32 text-foreground">Specialization:</span>
          <span className="text-muted-foreground">AI, Machine Learning, Full-stack Development</span>
        </div>
        <div className="detail-item flex items-center">
          <span className="detail-label font-medium w-32 text-foreground">Location:</span>
          <span className="text-muted-foreground">Banka, Bihar, India</span>
        </div>
      </div>
      <div className="developer-links flex space-x-4">
        <a href="https://www.linkedin.com/in/shivam-sourav-b889aa204/" target="_blank" rel="noopener noreferrer" className="social-link linkedin text-blue-600 hover:underline">LinkedIn</a>
        <a href="https://github.com/Shivam5560" target="_blank" rel="noopener noreferrer" className="social-link github text-gray-600 hover:underline">GitHub</a>
      </div>
    </div>
  );
}
