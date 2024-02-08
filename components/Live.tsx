import { useCallback, useEffect, useState } from "react";
import LiveCursor from "./cursor/LiveCursor"
import { useMyPresence, useOthers } from "@/liveblocks.config"
import CursorChat from "./cursor/CursorChat";
import { CursorMode, CursorState, Reaction } from "@/types/type";
import ReactionSelector from "./reaction/ReactionButton";
import FlyingReaction from "./reaction/FlyingReaction";
import useInterval from "@/hooks/useInterval";




const Live = () => {

  const [cursorState, setCursorState] = useState<CursorState>({  // track the state of the cursor (hidden, chat, reaction, reaction selector)
    mode: CursorMode.Hidden,
  });

  const others = useOthers();                                                     // usuarios en la room
  const [{ cursor }, updateMyPresence] = useMyPresence() as any;                  // presencia de un usuario en una room

 
  const [reactions, setReactions] = useState<Reaction[]>([]);                     // store the reactions created on mouse click

  const handlePointerMove = useCallback((event: React.PointerEvent) => {          // Listen to mouse events to change the cursor state
    event.preventDefault();
 
    if (cursor == null || cursorState.mode !== CursorMode.ReactionSelector) {     // if cursor is not in reaction selector mode, update the cursor position
            // pos in navegador // pos en el div
      const x = event.clientX - event.currentTarget.getBoundingClientRect().x;    // get the cursor position relative in the canvas
      const y = event.clientY - event.currentTarget.getBoundingClientRect().y;

      updateMyPresence({                                                          // broadcast the cursor position to other users
        cursor: {
          x,
          y,
        },
      });

    }  
  }, []);

  
  const handlePointerLeave = useCallback(() => {                                  // Hide the cursor when the mouse leaves the canvas
    setCursorState({
      mode: CursorMode.Hidden,
    });
    updateMyPresence({
      cursor: null,
      message: null,
    });
  }, []);
 
  const handlePointerDown = useCallback((event: React.PointerEvent) => {          // Show the cursor when the mouse enters the canvas
    
      const x = event.clientX - event.currentTarget.getBoundingClientRect().x;  // get the cursor position in the canvas
      const y = event.clientY - event.currentTarget.getBoundingClientRect().y;

      updateMyPresence({
        cursor: {
          x,
          y,
        },
      });

    setCursorState((state: CursorState) =>
      cursorState.mode === CursorMode.Reaction ? { ...state, isPressed: true } : state  // if cursor is in reaction mode, set isPressed to true
    );

  }, [cursorState.mode, setCursorState]);

  
  const handlePointerUp = useCallback(() => {                                     // hide the cursor when the mouse is up
    setCursorState((state: CursorState) =>
      cursorState.mode === CursorMode.Reaction ? { ...state, isPressed: false } : state
    );
  }, [cursorState.mode, setCursorState]);


  // Listen to keyboard events to change the cursor state
  useEffect(() => {
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "/") {
        setCursorState({
          mode: CursorMode.Chat,
          previousMessage: null,
          message: "",
        });
      } else if (e.key === "Escape") {
        updateMyPresence({ message: "" });
        setCursorState({ mode: CursorMode.Hidden });
      } else if (e.key === "e") {                                     // Si se presiona "e"
        setCursorState({ mode: CursorMode.ReactionSelector });        // Se activa el selector de Reactions -> <ReactionButton />
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/") {
        e.preventDefault();
      }
    };

    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [updateMyPresence]);

  
  const setReaction = useCallback((reaction: string) => {                                     // set the reaction of the cursor
    setCursorState({ mode: CursorMode.Reaction, reaction, isPressed: false });                // En cada click se modifica el estado del cursor 
  }, []);                                                                                     // y se crea una reaction

  
  useInterval(() => {
    if (cursorState.mode === CursorMode.Reaction && cursorState.isPressed && cursor) {        // Broadcast the reaction to other users (every 100ms)
      // concat all the reactions created on mouse click
      setReactions((reaction) =>
        reaction.concat([
          {
            point: { x: cursor.x, y: cursor.y },
            value: cursorState.reaction, // Esta es la reacción que se obtiene de cursorState
            timestamp: Date.now(),
          },
        ])
      );
    }
  }, 100);

  return (
    <div
      className="h-[100vh] w-full flex justify-center items-center text-center"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <h1 className="text-2xl text-white">Liveblocks</h1>

      {/* Render the reactions */}
      {reactions.map((reaction) => (
        <FlyingReaction
          key={reaction.timestamp.toString()}
          x={reaction.point.x}
          y={reaction.point.y}
          timestamp={reaction.timestamp}
          value={reaction.value}
        />
      ))}

      {cursor && (
        <CursorChat 
          cursor={cursor}
          cursorState={cursorState}
          setCursorState={setCursorState}
          updateMyPresence={updateMyPresence}
        />  
      )}

      {/* If cursor is in reaction selector mode, show the reaction selector */}
      {cursorState.mode === CursorMode.ReactionSelector && (
        <ReactionSelector
          setReaction={setReaction} // Este componente utiliza el cb que recibe una reaction y devuelve un estado del cursor     
        />
      )}

      <LiveCursor others={others} />
    </div>
  )
}

export default Live