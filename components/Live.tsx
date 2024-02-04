import { useCallback, useState } from "react";
import LiveCursor from "./cursor/LiveCursor"
import { useMyPresence, useOthers } from "@/liveblocks.config"




const Live = () => {

  const others = useOthers(); // usuarios en la room
  const [{ cursor }, updateMyPresence] = useMyPresence() as any; // presencia de un usuario en una room


  const handlePointerMove = useCallback((event: React.PointerEvent) => {          // Listen to mouse events to change the cursor state
      event.preventDefault();
    
      const x = event.clientX - event.currentTarget.getBoundingClientRect().x;    // get the cursor position in the canvas
      const y = event.clientY - event.currentTarget.getBoundingClientRect().y;
      
      updateMyPresence({                                                          // broadcast the cursor position to other users
        cursor: {
          x,
          y,
        },
      });
    
  }, []);

  
  const handlePointerLeave = useCallback(() => {            // Hide the cursor when the mouse leaves the canvas
    updateMyPresence({
      cursor: null,
      message: null,
    });
  }, []);
 
  const handlePointerDown = useCallback((event: React.PointerEvent) => {        // Show the cursor when the mouse enters the canvas
    
      const x = event.clientX - event.currentTarget.getBoundingClientRect().x;  // get the cursor position in the canvas
      const y = event.clientY - event.currentTarget.getBoundingClientRect().y;

      updateMyPresence({
        cursor: {
          x,
          y,
        },
      });

    },
    []
  );


  return (
    <div
      className="h-[100vh] w-full flex justify-center items-center text-center"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      //onPointerUp={handlePointerUp}
    >
      {/* <h1 className="text-2xl text-white">Liveblocks</h1> */}
      <LiveCursor others={others} />
    </div>
  )
}

export default Live