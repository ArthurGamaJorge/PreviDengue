// components/Header.tsx
import Link from "next/link";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-zinc-900 bg-opacity-90 backdrop-blur-sm shadow-md flex justify-between items-center px-8 py-4 text-white">
      <Link href="/">
        <h1 className="text-3xl font-bold tracking-tight">Undengue-Vision</h1>
      </Link>
    </header>
  );
}
