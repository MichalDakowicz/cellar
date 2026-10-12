import { createContext, useContext } from "react";
import type { PictureThumb } from "@/lib/entryPicture";

export const CellarPicturesContext = createContext<PictureThumb[]>([]);
export const useCellarPictures = () => useContext(CellarPicturesContext);
