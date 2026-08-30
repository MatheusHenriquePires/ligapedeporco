import { Shield } from 'lucide-react';

export default function FotoPlaceholder({ cor = '#31363F' }) {
  return (
    <div
      style={{
        position: 'absolute', inset: 0, background: 'var(--s3)',
        display: 'grid', placeItems: 'center',
      }}
      aria-hidden="true"
    >
      <Shield style={{ width: '34%', height: '34%', color: cor, opacity: 0.4 }} />
    </div>
  );
}
