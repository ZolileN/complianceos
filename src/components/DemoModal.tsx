'use client';

import React, { useEffect, useState } from 'react';

export default function DemoModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#book-demo') {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const closeModal = () => {
    window.history.pushState('', document.title, window.location.pathname + window.location.search);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h2 className="modal-title">Book a Demo</h2>
          <button className="btn btn-ghost btn-icon" onClick={closeModal} type="button">✕</button>
        </div>
        <div className="modal-body">
          <form action="https://formsubmit.co/hello@mlkcomputer.com" method="POST" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input type="hidden" name="_subject" value="New Demo Request from PraxisOne" />
            <input type="hidden" name="_captcha" value="false" />
            <input type="hidden" name="_template" value="table" />
            
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" name="name" className="input" placeholder="Tony Stark" required />
            </div>
            
            <div className="form-group">
              <label className="form-label">Work Email</label>
              <input type="email" name="email" className="input" placeholder="tony@starkindustries.com" required />
            </div>
            
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input type="text" name="company" className="input" placeholder="Stark Industries" required />
            </div>

            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label">Message</label>
              <textarea name="message" className="textarea" placeholder="How can we help you?" rows={3} required></textarea>
            </div>
            
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
              Submit Request
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
