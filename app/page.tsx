"use client"

import { fabric } from 'fabric'
import LeftSidebar from "@/components/LeftSidebar";
import Live from "@/components/Live";
import Navbar from "@/components/Navbar";
import RightSidebar from "@/components/RightSidebar";
import { useEffect, useRef, useState } from "react";
import { handleCanvasMouseDown, handleResize, initializeFabric } from '@/lib/canvas';
import { ActiveElement } from '../types/type';


export default function Page() {

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null)
  const isDrawing = useRef(false);
  const shapeRef = useRef<fabric.Object | null>(null);
  const selectedShapeRef= useRef<string | null>('rectangle');
  const [activeElement, setActiveElement] = useState<ActiveElement>({     // object that contains the name, value and icon of the active element in the navbar.
    name: '',
    value: '',
    icon: '',
  });
  const imageInputRef = useRef<HTMLInputElement>(null);                   // reference to the input element that we use to upload an image to the canvas.

  const handleActiveElement = (elem: ActiveElement) => {
    setActiveElement(elem);
    selectedShapeRef.current = elem?.value as string
  }

  useEffect(() => {
    const canvas = initializeFabric({ canvasRef, fabricRef })

    canvas.on("mouse:down", (options) => {
      handleCanvasMouseDown({
        options,
        canvas,
        isDrawing,
        shapeRef,
        selectedShapeRef
      }); 
    })

    window.addEventListener("resize", () => {
      const canvas = fabricRef.current
      handleResize( { canvas })
    })

  },[])

  return (
  
    <main className="h-screen overflow-hidden">
      <Navbar 
        activeElement={activeElement}
        handleActiveElement={handleActiveElement}
        imageInputRef={imageInputRef}
        handleImageUpload={() => {}}
      />
      <section className="flex h-full flex-row">
        <LeftSidebar 
          
        />
        <Live canvasRef={canvasRef} />
        <RightSidebar />
      </section> 
    </main>
 
  );
}