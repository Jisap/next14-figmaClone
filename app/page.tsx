"use client"

import { fabric } from 'fabric'
import LeftSidebar from "@/components/LeftSidebar";
import Live from "@/components/Live";
import Navbar from "@/components/Navbar";
import RightSidebar from "@/components/RightSidebar";
import { useEffect, useRef, useState } from "react";
import { handleCanvasMouseDown, handleCanvasMouseUp, handleCanvasObjectModified, handleCanvasObjectMoving, handleCanvaseMouseMove, handleResize, initializeFabric, renderCanvas } from '@/lib/canvas';
import { ActiveElement } from '../types/type';
import { useMutation, useRedo, useStorage, useUndo } from '@/liveblocks.config';
import { defaultNavElement } from '@/constants';
import { handleDelete, handleKeyDown } from '@/lib/key-events';
import { handleImageUpload } from '@/lib/shapes';


export default function Page() {

  const undo = useUndo();
  const redo = useRedo();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null)
  const isDrawing = useRef(false);
  const shapeRef = useRef<fabric.Object | null>(null);
  const selectedShapeRef= useRef<string | null>(null);
  const [activeElement, setActiveElement] = useState<ActiveElement>({     // object that contains the name, value and icon of the active element in the navbar.
    name: '',
    value: '',
    icon: '',
  });
  const imageInputRef = useRef<HTMLInputElement>(null);                   // reference to the input element that we use to upload an image to the canvas.
  const activeObjectRef = useRef<fabric.Object | null>(null);             // reference to the active/selected object in the canvas

  const canvasObjects = useStorage((root) => root.canvasObjects);         // Permite almacenar data en un formato key - value y automaticamente sincronizarlo con otros usuarios

  const syncShapeInStorage = useMutation(({ storage }, object) => {       // Con este  hook los cambios en la shape se traslandan al storage definido en useStorage
    if (!object) return;                                                  // Si el objeto pasado es null, return
    const { objectId } = object;                                          // pero si lo tnemos obtenemos el id

    const shapeData = object.toJSON();                                    // Se convierte el objeto object en un formato JSON 
    shapeData.objectId = objectId;                                        // Se agrega la propiedad objectId al objeto shapeData
    
    const canvasObjects = storage.get("canvasObjects");                   // Se obtiene una referencia al almacén de clave-valor utilizando storage.get("canvasObjects").

    canvasObjects.set(objectId, shapeData);                               // Se agrega o actualiza el objeto serializado de la forma en el almacén de clave-valor utilizando el objectId como clave y shapeData como valor.
  },[])

  const deleteAllShapes = useMutation(({ storage }) => {                  // deletes all the shapes from the key - value store of liveblocks.
    const canvasObjects = storage.get("canvasObjects");                   // get the canvasObjects store

    if (!canvasObjects || canvasObjects.size === 0) return true;          // if the store doesn't exist or is empty, return

    for (const [key, value] of canvasObjects.entries()) {                 // delete all the shapes from the store
      canvasObjects.delete(key);
    }
    return canvasObjects.size === 0;                                      // return true if the store is empty
  }, []);

  const deleteShapeFromStorage = useMutation(({ storage }, shapeId) => {  // deleteShapeFromStorage is a mutation that deletes a shape from the key - value store of liveblocks
    const canvasObjects = storage.get("canvasObjects");
    canvasObjects.delete(shapeId);
  },[]);

  const handleActiveElement = (elem: ActiveElement) => {
    setActiveElement(elem);
    switch (elem?.value) {
      case 'reset':
        deleteAllShapes();
        fabricRef.current?.clear();
        setActiveElement(defaultNavElement)
        break;
      case 'delete':
        handleDelete(fabricRef.current as any, deleteShapeFromStorage)
        setActiveElement(defaultNavElement)
      case 'image':
        imageInputRef.current?.click(); // click sobre el input
        isDrawing.current = false;      // Si estaba dibujando y clicko en image
        if(fabricRef.current){
          fabricRef.current.isDrawingMode = false;
        }
        break
      case "comments":
        break

      default:
        selectedShapeRef.current = elem?.value as string
        break;
    }
  }

  useEffect(() => {
    const canvas = initializeFabric({ canvasRef, fabricRef })

    canvas.on("mouse:down", (options) => {    // Escucha el click sobre el evento mouse:down -> handleCanvasMouseDown -> createSpecificShape (todo ello en /lib/canvas)
      handleCanvasMouseDown({
        options,
        canvas,
        isDrawing,
        shapeRef,
        selectedShapeRef
      }); 
    })

    canvas.on("mouse:move", (options) => {    // listen to the mouse move event on the canvas which is fired when the user moves the mouse on the canvas
      handleCanvaseMouseMove({
        options,
        canvas,
        isDrawing,
        shapeRef,
        selectedShapeRef,
        syncShapeInStorage // Actualiza el shape, lo almacena en storage y lo comparte con el resto de users 
      });
    })

    canvas.on("mouse:up", (options) => {      // listen to the mouse up event on the canvas which is fired when the user releases the mouse on the canvas
      handleCanvasMouseUp({
        canvas,
        isDrawing,
        shapeRef,
        selectedShapeRef,
        syncShapeInStorage,
        setActiveElement,
        activeObjectRef
      });
    });

    canvas.on("object:modified", (options) => { // listen to the object modified event on the canvas which is fired when the user modifies an object on the canvas.
      handleCanvasObjectModified({
        options,
        syncShapeInStorage,
      });
    });

    canvas?.on("object:moving", (options) => {  // listen to the object moving event on the canvas which is fired when the user moves an object on the canvas.
      handleCanvasObjectMoving({
        options,
      });
    });

    window.addEventListener("resize", () => {
      handleResize( { canvas : fabricRef.current })
    });

    window.addEventListener("keydown", (e) => {
      handleKeyDown({
        e, canvas: fabricRef.current,
        undo,
        redo,
        syncShapeInStorage,
        deleteShapeFromStorage,
      })
    })

    return () => {
      canvas.dispose();                             // It clears the canvas and removes all the event listeners

      window.removeEventListener("resize", () => {  // remove the event listeners
        handleResize({
          canvas: null,
        });
      });

      window.removeEventListener("keydown", (e) => 
        handleKeyDown({
          e,
          canvas: fabricRef.current,
          undo,
          redo,
          syncShapeInStorage,
          deleteShapeFromStorage,
        })
      );
    }

  },[canvasRef])

  // render the canvas when the canvasObjects from live storage changes
  useEffect(() => {
    renderCanvas({
      fabricRef,
      canvasObjects,
      activeObjectRef,
    });
  }, [canvasObjects]);

  return (
  
    <main className="h-screen overflow-hidden">
      <Navbar 
        activeElement={activeElement}
        handleActiveElement={handleActiveElement}
        imageInputRef={imageInputRef}
        handleImageUpload={(e:any) => {
          e.stopPropagation();
          handleImageUpload({
            file: e.target.files[0],
            canvas: fabricRef as any,
            shapeRef,
            syncShapeInStorage
          })
        }}
      />
      <section className="flex h-full flex-row">
        <LeftSidebar 
          allShapes={Array.from(canvasObjects)}
        />
        <Live canvasRef={canvasRef} />
        <RightSidebar />
      </section> 
    </main>
 
  );
}