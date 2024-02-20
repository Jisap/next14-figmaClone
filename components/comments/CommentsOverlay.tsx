"use client";

import { useCallback, useRef } from "react";
import { ThreadData } from "@liveblocks/client";

import { ThreadMetadata, useEditThreadMetadata, useThreads, useUser } from "@/liveblocks.config";
import { useMaxZIndex } from "@/lib/useMaxZIndex";

import { PinnedThread } from "./PinnedThread";

type OverlayThreadProps = {
  thread: ThreadData<ThreadMetadata>;
  maxZIndex: number;
};

export const CommentsOverlay = () => {  // Se encarga de mostrar todos los comentarios activos en la pantalla, 
 
  const { threads } = useThreads();     // We're using the useThreads hook to get the list of threads in the room

  const maxZIndex = useMaxZIndex();     // Get the max z-index of a thread

  return (
    <div>
      {threads
        .filter((thread) => !thread.metadata.resolved)
        .map((thread) => (
          <OverlayThread key={thread.id} thread={thread} maxZIndex={maxZIndex} />
        ))}
    </div>
  );
};

const OverlayThread = ({ thread, maxZIndex }: OverlayThreadProps) => {  // se encarga de renderizar cada hilo individualmente y manejar interacciones específicas de cada hilo, 
  
  const editThreadMetadata = useEditThreadMetadata();                   // Proporciona la lista de hilos disponibles

  const { isLoading } = useUser(thread.comments[0].userId);             // Proporciona los hilos de un usuario

  const threadRef = useRef<HTMLDivElement>(null);                       // Ref de un hilo para obtener su posición

  const handleIncreaseZIndex = useCallback(() => {  // Cuando se da foco a un hilo, se incrementa su zIndex 
    if (maxZIndex === thread.metadata.zIndex) {     // para asegurarse de que esté por encima de otros elementos en la pantalla.
      return;
    }

    editThreadMetadata({      // Actualiza el z-index del hilo en la room 
      threadId: thread.id,
      metadata: {
        zIndex: maxZIndex + 1,
      },
    });
  }, [thread, editThreadMetadata, maxZIndex]);

  if (isLoading) {
    return null;
  }

  return (
    <div
      ref={threadRef}
      id={`thread-${thread.id}`}
      className="absolute left-0 top-0 flex gap-5"
      style={{
        transform: `translate(${thread.metadata.x}px, ${thread.metadata.y}px)`,
      }}
    >
      {/* render the thread */}
      <PinnedThread thread={thread} onFocus={handleIncreaseZIndex} />
    </div>
  );
};