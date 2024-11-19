import React, { createContext, useMemo, useContext} from "react";
import { io } from "socket.io-client";


const SocketContext = createContext(null);

export const useSocket = () => {
  const socket = useContext(SocketContext);
  return socket;
};

export const SocketProvider = (props) => {
  const socket = useMemo(() => io("https://signaling-server-g4h3ajgkbuhygpdn.canadacentral-01.azurewebsites.net"), []);

  return (
    <SocketContext.Provider value={socket}>
      {props.children}
    </SocketContext.Provider>
  );
};

