import React from 'react';
import PropTypes from 'prop-types';

const Header = ({ text, topSpacing = 0, bottomSpacing = 0 }) => {
  const headerStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: `${topSpacing}px`, // Use the topSpacing prop
    paddingBottom: `${bottomSpacing}px`, // Use the bottomSpacing prop
    textAlign: 'center',
    color: 'var(--colorTextBody)',
    fontSize: 'calc((48 / 16) * 1rem)', // Default font size for larger screens
    letterSpacing: '-0.005em',
    transition: 'font-size 0.3s ease-out',
    paddingLeft: '20px',
    paddingRight: '20px',
  };

  const h1Style = {
    margin: 0,
  };

  return (
    <div style={headerStyle}>
      <h1 style={h1Style}>{text}</h1>
      <style jsx>{`
        @media (max-width: 860px) {
          h1 {
            font-size: calc((32 / 16) * 1rem);
          }
        }
        @media (max-width: 768px) {
          h1 {
            font-size: calc((28 / 16) * 1rem);
          }
        }
        @media (max-width: 480px) {
          h1 {
            font-size: calc((24 / 16) * 1rem);
          }
        }
      `}</style>
    </div>
  );
};

Header.propTypes = {
  text: PropTypes.string.isRequired,
  topSpacing: PropTypes.number,
  bottomSpacing: PropTypes.number,
};

export default Header;
