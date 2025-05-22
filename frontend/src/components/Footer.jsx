import React from 'react';

const Footer = () => {
  return (
    <footer style={{
      backgroundColor: '#851eac',
      color: 'white',
      textAlign: 'center',
      padding: '20px 0',
      width: '100%',
      position: 'relative',
      bottom: '0'
    }}>
      <p style={{margin: 0}}>
        © {new Date().getFullYear()} Sistema de Monitoreo. Todos los derechos reservados.
      </p>
    </footer>
  );
};

export default Footer;