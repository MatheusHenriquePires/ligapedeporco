import Modal from './Modal.jsx';

export default function ModalConfirmar({ aberto, titulo = 'Confirmar remoção', mensagem, onCancelar, onConfirmar, confirmando }) {
  return (
    <Modal aberto={aberto} titulo={titulo} onFechar={onCancelar} largura={420}>
      <p style={{ color: 'var(--suave)', marginBottom: 20 }}>{mensagem}</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn vazado" onClick={onCancelar} disabled={confirmando}>Cancelar</button>
        <button type="button" className="btn perigo" onClick={onConfirmar} disabled={confirmando}>
          {confirmando ? 'Removendo…' : 'Remover'}
        </button>
      </div>
    </Modal>
  );
}
