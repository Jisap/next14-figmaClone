import { useCallback, useEffect, useState } from "react";
import LiveCursor from "./cursor/LiveCursor"
import { useBroadcastEvent, useEventListener, useMyPresence, useOthers } from "@/liveblocks.config"
import CursorChat from "./cursor/CursorChat";
import { CursorMode, CursorState, Reaction } from "@/types/type";
import ReactionSelector from "./reaction/ReactionButton";
import FlyingReaction from "./reaction/FlyingReaction";
import useInterval from "@/hooks/useInterval";
import { Comments } from "./comments/Comments";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { shortcuts } from "@/constants";



type Props = {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  undo: () => void;
  redo: () => void;
}

const Live = ({ canvasRef, undo, redo }: Props) => {

  const [cursorState, setCursorState] = useState<CursorState>({  // track the state of the cursor (hidden, chat, reaction, reaction selector)
    mode: CursorMode.Hidden,
  });

  const [{ cursor }, updateMyPresence] = useMyPresence();                         // presencia de un usuario en una room


  const [reactions, setReactions] = useState<Reaction[]>([]);                     // store the reactions (emoticons) created on mouse click
  const broadcast = useBroadcastEvent();


  useInterval(() => {
    setReactions((reactions) => reactions.filter((reaction) => reaction.timestamp > Date.now() - 4000));  // Remove reactions that are not visible (4secs) anymore (every 1 sec)
  }, 1000);


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

    const x = event.clientX - event.currentTarget.getBoundingClientRect().x;      // get the cursor position in the canvas
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
    if (cursorState.mode === CursorMode.Reaction && cursorState.isPressed && cursor) {        // Cada 100 milisegundos actualizamos el estado de reactions
      // concat all the reactions created on mouse click
      setReactions((reactions) =>
        reactions.concat([
          {
            point: { x: cursor.x, y: cursor.y },
            value: cursorState.reaction, // Esta es la reacción que se obtiene de cursorState 
            timestamp: Date.now(),
          },
        ])
      );
      broadcast({                                                                               // Broadcast the reaction to other users
        x: cursor.x,                                                                            // Esto se considera una emisión de eventos tipo ReactionEvent
        y: cursor.y,
        value: cursorState.reaction,
      });
    }
  }, 100);

  useEventListener((eventData) => {                                                             // useEventListener is used to listen to events broadcasted by other
    const event = eventData.event;                                                              // Se obtiene el evento  (tipo asignado por liveblocks)                                           
    setReactions((reactions) =>                                                                 // y se añade al estado de Reaction
      reactions.concat([
        {
          point: { x: event.x, y: event.y },
          value: event.value,
          timestamp: Date.now(),
        },
      ])
    );
  });

  // trigger respective actions when the user clicks on the right menu
  const handleContextMenuClick = useCallback((key: string) => {
    switch (key) {
      case "Chat":
        setCursorState({
          mode: CursorMode.Chat,
          previousMessage: null,
          message: "",
        });
        break;

      case "Reactions":
        setCursorState({ mode: CursorMode.ReactionSelector });
        break;

      case "Undo":
        undo();
        break;

      case "Redo":
        redo();
        break;

      default:
        break;
    }
  }, []);

  return (

    <ContextMenu>

      <ContextMenuTrigger
        id="canvas"
        className="relative h-full w-full flex flex-1 justify-center items-center"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >

        <canvas ref={canvasRef} />

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
          // Si el mouse esta en el canvas y existe cursor provocado por uptadedMyPresence -> cursorMode=chat -> Se muestra <CursorChat />
          <CursorChat 
            cursor={cursor}
            cursorState={cursorState}
            setCursorState={setCursorState}
            updateMyPresence={updateMyPresence}
          />
        )}

        {/* If cursor is in reaction selector mode (tecla "e"), show the reaction selector */}
        {cursorState.mode === CursorMode.ReactionSelector && (
          <ReactionSelector
            setReaction={setReaction} // Este componente utiliza el cb que recibe una reaction y devuelve un estado del cursor -> permite actualizar estado de reactions    
          />
        )}

        <LiveCursor />

        <Comments />
      </ContextMenuTrigger>

      <ContextMenuContent className="right-menu-content">
        {shortcuts.map((item) => (
          <ContextMenuItem
            key={item.key}
            className="right-menu-item"
            onClick={() => handleContextMenuClick(item.name)}
          >
            <p>{item.name}</p>
            <p className="text-xs text-primary-grey-300">{item.shortcut}</p>
          </ContextMenuItem>
        ))}
      </ContextMenuContent>

    </ContextMenu>
  )
}

export default Live