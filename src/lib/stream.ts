import { StreamChat } from "stream-chat";

const streamServerClient = StreamChat.getInstance(
  process.env.NEXT_PUBLIC_STREAM_KEY!,
  process.env.STREAM_SECRET,
  {
    // Increase default HTTP timeout to reduce Axios timeout errors on slow networks
    timeout: 10000,
  },
);

export default streamServerClient;
