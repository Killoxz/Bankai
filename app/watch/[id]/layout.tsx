export default function WatchLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/*
        Material Symbols Rounded is only used by the video player and series
        sidebar — load it here so every other page stays free of the ~140 KB font.
      */}
      <link
        rel="preload"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        as="style"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />
      {children}
    </>
  );
}
