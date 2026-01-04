import { useMemo } from 'react';

interface BalloonsOverlayProps {
  seed: number;
}

const BalloonsOverlay = ({ seed }: BalloonsOverlayProps) => {
  const balloons = useMemo(() => {
    const colors = ['#7c3aed', '#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
    const count = 14;
    return Array.from({ length: count }).map((_, i) => {
      const left = ((seed + i * 47) % 100) * 1.0; // deterministic-ish
      const size = 34 + ((seed + i * 31) % 26); // 34..59
      const delay = (i % 6) * 0.18;
      const float = 4.2 + (i % 5) * 0.35;
      const sway = 1.9 + (i % 4) * 0.35;
      const color = colors[(seed + i) % colors.length];
      return { id: `${seed}-${i}`, left, size, delay, float, sway, color };
    });
  }, [seed]);

  return (
    <div className="lb-celebration-root" aria-hidden="true">
      {balloons.map((b) => (
        <div
          key={b.id}
          className="lb-balloon"
          style={{
            left: `${b.left}%`,
            ['--lb-size' as any]: `${b.size}px`,
            ['--lb-delay' as any]: `${b.delay}s`,
            ['--lb-float' as any]: `${b.float}s`,
            ['--lb-sway' as any]: `${b.sway}s`,
            ['--lb-color' as any]: b.color,
          }}
        >
          <div className="lb-balloon-string" />
        </div>
      ))}

      <div className="absolute inset-x-0 top-6 flex justify-center">
        <div className="bg-white/85 backdrop-blur-md border border-indigo-100 shadow-lg rounded-full px-4 py-2 text-sm font-bold text-indigo-700">
          Perfect score! 🎉
        </div>
      </div>
    </div>
  );
};

export default BalloonsOverlay;

