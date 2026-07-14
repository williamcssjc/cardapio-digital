export default function ObrigadoPage() {
    return (
      <main style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--parrilla-bg)',
        padding: '24px',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 700,
          color: 'var(--parrilla-red)',
          letterSpacing: '-0.02em',
          margin: 0,
        }}>
          +54
        </h1>
  
        <h2 style={{
          fontSize: '22px',
          fontWeight: 600,
          color: 'var(--parrilla-text)',
          marginTop: '32px',
          marginBottom: 0,
        }}>
          Obrigado pela visita!
        </h2>
  
        <p style={{
          fontSize: '15px',
          color: 'var(--parrilla-muted)',
          marginTop: '8px',
          marginBottom: 0,
          lineHeight: 1.6,
        }}>
          Foi um prazer te atender.
        </p>
  
        <div style={{
          width: '40px',
          height: '2px',
          background: 'var(--parrilla-red)',
          marginTop: '32px',
          marginBottom: '32px',
        }} />
  
        <p style={{
          fontSize: '13px',
          color: 'var(--parrilla-muted)',
          margin: 0,
        }}>
          Se quiser fazer um novo pedido,
        </p>
  
        <p style={{
          fontSize: '13px',
          color: 'var(--parrilla-muted)',
          marginTop: '4px',
          marginBottom: 0,
        }}>
          escaneie o QR Code da mesa novamente.
        </p>
      </main>
    )
  }