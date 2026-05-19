export function AmbientBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/30 blur-3xl animate-blob" />
      <div className="absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full bg-accent/20 blur-3xl animate-blob" style={{ animationDelay: "4s" }} />
      <div className="absolute -bottom-40 left-1/3 h-[500px] w-[500px] rounded-full bg-neon-pink/20 blur-3xl animate-blob" style={{ animationDelay: "8s" }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,transparent_40%,oklch(0.08_0.03_280)_70%)]" />
    </div>
  );
}
