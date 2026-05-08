"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Pages() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
    } else {
      router.replace("/dashboard");
    }
  }, [router]);

  return null; // No renderiza nada, solo redirige
}
