import { NextApiRequest, NextApiResponse } from 'next';
import { initSocket } from '@/lib/socket';

export const config = {
  api: {
    bodyParser: false,
  },
};

const ioHandler = (req: NextApiRequest, res: NextApiResponse) => {
  const io = initSocket(res);
  if (!io) {
    res.status(500).end();
    return;
  }
  res.end();
};

export default ioHandler; 