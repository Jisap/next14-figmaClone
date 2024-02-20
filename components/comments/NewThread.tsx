"use client";

import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Slot } from "@radix-ui/react-slot";
import * as Portal from "@radix-ui/react-portal";
import { ComposerSubmitComment } from "@liveblocks/react-comments/primitives";

import { useCreateThread } from "@/liveblocks.config";
import { useMaxZIndex } from "@/lib/useMaxZIndex";

import PinnedComposer from "./PinnedComposer";
import NewThreadCursor from "./NewThreadCursor";

type ComposerCoords = null | { x: number; y: number };

type Props = {
  children: ReactNode;
};

export const NewThread = ({ children }: Props) => {

  // Estado para saber si el usuario esta colocando un comentario, si lo coloco  si ya terminó
  const [creatingCommentState, setCreatingCommentState] = useState<"placing" | "placed" | "complete">("complete");

  const createThread = useCreateThread();                       // Este hook permite crear un hilo de comentarios

  const maxZIndex = useMaxZIndex();                             // get the max z-index of a thread

  const [composerCoords, setComposerCoords] = useState<ComposerCoords>(null); // Establece el estado de las coordenadas del editor de comentarios

  const lastPointerEvent = useRef<PointerEvent>();              // almacene el último evento de puntero registrado por el usuario.

  const [allowUseComposer, setAllowUseComposer] = useState(false); // Estado para saber si el usuario tiene permiso para usar el editor
  const allowComposerRef = useRef(allowUseComposer);               // Este estado se referencia a un objeto mutable 
  allowComposerRef.current = allowUseComposer;                     // y aqui se actualiza 

  useEffect(() => {
    
    if (creatingCommentState === "complete") {                          // If composer is already placed, don't do anything
      return;
    }
 
    const newComment = (e: MouseEvent) => {                             // Place a composer on the screen 
      e.preventDefault();
   
      if (creatingCommentState === "placed") {                          // Si el editor ya ha sido colocado comprobamos
        
        const isClickOnComposer = ((e as any)._savedComposedPath = e    // si el click se realizó dentro de el
          .composedPath()                                               // se comprueba que acciones se ejecutaron del editor
          .some((el: any) => {
            return el.classList?.contains("lb-composer-editor-actions");
          }));

        if (isClickOnComposer) {                                        // si el click se realizo dentro del editor no se hace nada
          return;
        }

        if (!isClickOnComposer) {                                       // si el click se realizó fuera de el se cierra el editor
          setCreatingCommentState("complete");
          return;
        }
      }

     
      setCreatingCommentState("placed");   // el primer click establece el editor como colocado
      setComposerCoords({                  // y establece también las coordenadas del mismo.   
        x: e.clientX,
        y: e.clientY,
      });
    };

    document.documentElement.addEventListener("click", newComment);

    return () => {
      document.documentElement.removeEventListener("click", newComment);
    };
  }, [creatingCommentState]);

  useEffect(() => {
    
    const handlePointerMove = (e: PointerEvent) => {            // If dragging composer, update position
     
      (e as any)._savedComposedPath = e.composedPath();         // Prevents issue with composedPath getting removed
      lastPointerEvent.current = e;
    };

    document.documentElement.addEventListener("pointermove", handlePointerMove);

    return () => {
      document.documentElement.removeEventListener(
        "pointermove",
        handlePointerMove
      );
    };
  }, []);

  
  useEffect(() => {                                             // Set pointer event from last click on body for use later
    if (creatingCommentState !== "placing") {
      return;
    }

    const handlePointerDown = (e: PointerEvent) => {
      // if composer is already placed, don't do anything
      if (allowComposerRef.current) {
        return;
      }

      // Prevents issue with composedPath getting removed
      (e as any)._savedComposedPath = e.composedPath();
      lastPointerEvent.current = e;
      setAllowUseComposer(true);
    };

    // Right click to cancel placing
    const handleContextMenu = (e: Event) => {
      if (creatingCommentState === "placing") {
        e.preventDefault();
        setCreatingCommentState("complete");
      }
    };

    document.documentElement.addEventListener("pointerdown", handlePointerDown);
    document.documentElement.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.documentElement.removeEventListener(
        "pointerdown",
        handlePointerDown
      );
      document.documentElement.removeEventListener(
        "contextmenu",
        handleContextMenu
      );
    };
  }, [creatingCommentState]);

  
  const handleComposerSubmit = useCallback(                              // On composer submit, create thread and reset state
    ({ body }: ComposerSubmitComment, event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const overlayPanel = document.querySelector("#canvas");            // Get your canvas element 

      // if there's no composer coords or last pointer event, meaning the user hasn't clicked yet, don't do anything
      if (!composerCoords || !lastPointerEvent.current || !overlayPanel) {
        return;
      }

      // Set coords relative to the top left of your canvas
      const { top, left } = overlayPanel.getBoundingClientRect();
      const x = composerCoords.x - left;
      const y = composerCoords.y - top;

      // create a new thread with the composer coords and cursor selectors
      createThread({
        body,
        metadata: {
          x,
          y,
          resolved: false,
          zIndex: maxZIndex + 1,
        },
      });

      setComposerCoords(null);
      setCreatingCommentState("complete");
      setAllowUseComposer(false);
    },
    [createThread, composerCoords, maxZIndex]
  );

  return (
    <>
      {/**
       * Slot is used to wrap the children of the NewThread component
       * to allow us to add a click event listener to the children
       */}
      <Slot
        onClick={() =>
          setCreatingCommentState(
            creatingCommentState !== "complete" ? "complete" : "placing"
          )
        }
        style={{ opacity: creatingCommentState !== "complete" ? 0.7 : 1 }}
      >
        {children}
      </Slot>

      {/* if composer coords exist and we're placing a comment, render the composer */}
      {composerCoords && creatingCommentState === "placed" ? (
        /**
         * Portal.Root is used to render the composer outside of the NewThread component to avoid z-index issuess
         *
         * Portal.Root: https://www.radix-ui.com/primitives/docs/utilities/portal
         */
        <Portal.Root
          className='absolute left-0 top-0'
          style={{
            pointerEvents: allowUseComposer ? "initial" : "none",
            transform: `translate(${composerCoords.x}px, ${composerCoords.y}px)`,
          }}
          data-hide-cursors
        >
          <PinnedComposer onComposerSubmit={handleComposerSubmit} />
        </Portal.Root>
      ) : null}

      {/* Show the customizing cursor when placing a comment. The one with comment shape */}
      <NewThreadCursor display={creatingCommentState === "placing"} />
    </>
  );
};