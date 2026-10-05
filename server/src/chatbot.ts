export interface BotReply {
  reply: string;
  suggestions: string[];
  startEnquiry?: boolean;
}

const MENU = ['Drone services', 'Courses & training', 'Pricing', 'Contact us', 'Send an enquiry'];


const rules: { keywords: string[]; reply: string; startEnquiry?: boolean }[] = [
  { keywords: ['hi', 'hello', 'hey'], reply: 'Hello! I can help with drone services, courses and enquiries. What would you like to know?' },
  { keywords: ['service', 'drone', 'shoot', 'aerial'], reply: 'We offer aerial photography and videography, drone mapping and surveys, and event coverage. Want to send us your project details?' },
  { keywords: ['course', 'training', 'learn', 'student', 'pilot'], reply: 'We run drone pilot training from beginner to advanced. Share your details and our team will send batch information.' },
  { keywords: ['pric', 'cost', 'fee', 'charge', 'quote'], reply: 'Pricing depends on the service and project scope. Send an enquiry and we will share a quote.' },
  { keywords: ['contact', 'phone', 'call', 'email', 'human', 'agent'], reply: 'Leave an enquiry here and our team will get back to you shortly.' },
  { keywords: ['enquiry', 'inquiry', 'apply', 'book', 'interested'], reply: 'Great! Please fill in the short form and our team will contact you.', startEnquiry: true },
  { keywords: ['thank', 'bye'], reply: 'You are welcome! Have a great day.' },
];

export function getReply(input: string): BotReply {
  const text = input.toLowerCase();
  const words = text.split(/[^a-z]+/);

  for (const rule of rules) {

    const hit = rule.keywords.some((k) =>
      k.length <= 3 ? words.includes(k) : text.includes(k)
    );
    if (hit) {
      return { reply: rule.reply, suggestions: MENU, startEnquiry: rule.startEnquiry };
    }
  }

  return {
    reply: "Sorry, I didn't quite get that. Please pick a topic below or send us an enquiry.",
    suggestions: MENU,
  };
}