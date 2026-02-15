"use client";

import { createContext, useContext } from "react";

type SidebarContextType = {
    collapsed: boolean;
    setCollapsed: (v: boolean) => void;
};

export const SidebarContext = createContext<SidebarContextType>({
    collapsed: false,
    setCollapsed: () => { },
});

export function useSidebar() {
    return useContext(SidebarContext);
}
