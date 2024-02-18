
"use client";

import Image from "next/image";
import { memo } from "react";


import { ActiveElement, NavbarProps } from "@/types/type";
import ActiveUsers from "./users/ActiveUsers";
import { navElements } from "@/constants";
import ShapesMenu from "./ShapesMenu";
import { NewThread } from "./comments/NewThread";
import { Button } from "./ui/button";


const Navbar = ({ activeElement, imageInputRef, handleImageUpload, handleActiveElement }: NavbarProps) => {

  const isActive = (value: string | Array<ActiveElement>) =>                              // isActive devuelve true si
    (activeElement && activeElement.value === value) ||                                   // el valor que se le pasa = al del argumento del Navbar
    (Array.isArray(value) && value.some((val) => val?.value === activeElement?.value));   // o si value es un arreglo y al menos uno de sus elementos tiene un valor que coincide con el valor de activeElement.

  return (
    <nav className="flex select-none items-center justify-between gap-4 bg-primary-black px-5 text-white">
      <Image 
        src="/assets/logo.svg" 
        alt="FigPro Logo" 
        width={58} 
        height={20} 
      />

      <ul className="flex flex-row">
        { navElements.map((item:ActiveElement | any) => (
          <li
            key={item.name}
            onClick={() => {
              if (Array.isArray(item.value)) return;
              handleActiveElement(item);
            }}
            className={`group px-2.5 py-5 flex justify-center items-center
            ${isActive(item.value) ? "bg-primary-green" : "hover:bg-primary-grey-200"}
            `}
          >
            {Array.isArray(item.value) 
              ? ( <ShapesMenu 
                    item={item}
                    activeElement={activeElement}
                    imageInputRef={imageInputRef}
                    handleActiveElement={handleActiveElement}
                    handleImageUpload={handleImageUpload}
                  /> )
              : item?.value === 'comments' ? (
                <NewThread>
                  <Button className="relative w-5 h-5 object-contain">
                    <Image
                      src={item.icon}
                      alt={item.name}
                      fill
                      className={isActive(item.value) ? "invert" : ""}
                    />
                  </Button>
                </NewThread>  
              ) : (
                <Button className="relative w-5 h-5 object-contain">
                    <Image
                      src={item.icon}
                      alt={item.name}
                      fill
                      className={isActive(item.value) ? "invert" : ""}
                    />
                </Button>  
              )
            }
          </li>  
        ))}
      </ul>

      <ActiveUsers />
    
    </nav>
  );
};

export default memo(Navbar, (prevProps, nextProps) => prevProps.activeElement === nextProps.activeElement);