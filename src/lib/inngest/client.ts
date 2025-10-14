import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'personal-anything-notifier',
  name: 'Personal Anything Notifier',
  eventKey: process.env.INNGEST_EVENT_KEY,
});


