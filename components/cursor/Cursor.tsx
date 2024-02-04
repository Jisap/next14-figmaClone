import CursorSVG from "@/public/assets/CursorSVG";

type Props = {
  color: string;
  x: number;
  y: number;
  message: string;
}

const Cursor = ({ color, x, y, message }:Props) => {
  return (
    // Hace que un elemento ignore los eventos de puntero y se activen en elementos secundarios y pasando a elementos que están "debajo" del objetivo
    <div 
      className="pointer-events-none absolute top-0 left-0"
      style={{ transform: `translateX(${x}px) translateY(${y}px)` }}  
    >
      <CursorSVG color={color} />

    </div>
  )
}

export default Cursor