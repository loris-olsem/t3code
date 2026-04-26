export function SplashScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div
        className="flex size-24 items-center justify-center"
        aria-label="NitroCode splash screen"
      >
        <img alt="NitroCode" className="size-16 object-contain" src="/nitro-icon-animated.svg" />
      </div>
    </div>
  );
}
