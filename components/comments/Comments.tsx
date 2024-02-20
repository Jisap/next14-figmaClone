"use client";

import { ClientSideSuspense } from "@liveblocks/react";

import { CommentsOverlay } from "@/components/comments/CommentsOverlay";

export const Comments = () => (
  // Hasta que no se carguen los comentarios no se muestra CommentsOverlay
  <ClientSideSuspense fallback={null}>  
    {() => <CommentsOverlay />}
  </ClientSideSuspense>
);