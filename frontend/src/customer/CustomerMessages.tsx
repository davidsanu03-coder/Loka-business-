import { useMemo, useState, type FormEvent } from "react";
import "./styles/customerMessages.css";
import Sidebar from "./dashboard/Sidebar";
import ThemeToggle from "../theme/ThemeToggle";

interface Message {
  id: number;
  text: string;
  sentByCustomer: boolean;
  time: string;
}

interface Conversation {
  id: number;
  seller: string;
  initials: string;
  product: string;
  preview: string;
  time: string;
  unread: number;
  messages: Message[];
}

const initialConversations: Conversation[] = [
  {
    id: 1,
    seller: "Atelier Nomad",
    initials: "AN",
    product: "Linen Two-Piece Set",
    preview: "Your order will be ready soon.",
    time: "10:42 AM",
    unread: 2,
    messages: [
      {
        id: 1,
        text: "Hello! Thank you for your interest in our linen set.",
        sentByCustomer: false,
        time: "10:30 AM",
      },
      {
        id: 2,
        text: "Hi, please can you tell me when it will be available?",
        sentByCustomer: true,
        time: "10:35 AM",
      },
      {
        id: 3,
        text: "Your order will be ready soon.",
        sentByCustomer: false,
        time: "10:42 AM",
      },
    ],
  },
  {
    id: 2,
    seller: "Kora Goods",
    initials: "KG",
    product: "Everyday Sneakers",
    preview: "Yes, we have your size available.",
    time: "Yesterday",
    unread: 0,
    messages: [
      {
        id: 4,
        text: "Good afternoon. Do you have size 42 available?",
        sentByCustomer: true,
        time: "Yesterday",
      },
      {
        id: 5,
        text: "Yes, we have your size available.",
        sentByCustomer: false,
        time: "Yesterday",
      },
    ],
  },
  {
    id: 3,
    seller: "Hira Studio",
    initials: "HS",
    product: "Classic Everyday Bag",
    preview: "Thank you for shopping with us!",
    time: "Monday",
    unread: 0,
    messages: [
      {
        id: 6,
        text: "Is this bag available in another colour?",
        sentByCustomer: true,
        time: "Monday",
      },
      {
        id: 7,
        text: "Thank you for shopping with us!",
        sentByCustomer: false,
        time: "Monday",
      },
    ],
  },
];

const CustomerMessages = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState<number | null>(1);
  const [search, setSearch] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeId) ??
    null;

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return conversations;
    }

    return conversations.filter(
      (conversation) =>
        conversation.seller.toLowerCase().includes(query) ||
        conversation.product.toLowerCase().includes(query) ||
        conversation.preview.toLowerCase().includes(query) ||
        conversation.messages.some((message) =>
          message.text.toLowerCase().includes(query),
        ),
    );
  }, [conversations, search]);

  const unreadCount = conversations.reduce(
    (total, conversation) => total + conversation.unread,
    0,
  );

  const openConversation = (conversation: Conversation) => {
    setActiveId(conversation.id);
    setMobileChatOpen(true);

    setConversations((current) =>
      current.map((item) =>
        item.id === conversation.id
          ? { ...item, unread: 0 }
          : item,
      ),
    );
  };

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = messageInput.trim();

    if (!text || !activeConversation) {
      return;
    }

    const now = new Date();

    const time = now.toLocaleTimeString("en-NG", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newMessage: Message = {
      id: Date.now(),
      text,
      sentByCustomer: true,
      time,
    };

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeConversation.id
          ? {
              ...conversation,
              preview: text,
              time,
              messages: [...conversation.messages, newMessage],
            }
          : conversation,
      ),
    );

    setMessageInput("");
  };

  return (
    <div className="customer-messages">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {isSidebarOpen && (
        <button
          type="button"
          className="messages-sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close navigation menu"
        />
      )}

      <main className="messages-main">
        <header className="messages-topbar">
          <button
            type="button"
            className="messages-menu-button"
            onClick={() => setIsSidebarOpen((current) => !current)}
            aria-label={
              isSidebarOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            aria-expanded={isSidebarOpen}
            aria-controls="customer-sidebar"
          >
            <span />
            <span />
            <span />
          </button>

          <div className="messages-brand">LOKA</div>

          <div className="messages-topbar-actions">
            <ThemeToggle />

            <a
              href="/customer/profile"
              className="messages-avatar"
              aria-label="Customer profile"
            >
              DA
            </a>
          </div>
        </header>

        <section className="messages-content">
          <div className="messages-page-heading">
            <div>
              <p className="messages-eyebrow">YOUR INBOX</p>
              <h1>Messages</h1>
              <p>
                Chat with sellers and keep your conversations in one place.
              </p>
            </div>

            <div
              className="messages-total"
              aria-label={`${unreadCount} unread messages`}
            >
              <span>{unreadCount}</span>
              unread
            </div>
          </div>

          <div
            className={`messages-workspace ${
              mobileChatOpen ? "chat-open" : ""
            }`}
          >
            <aside
              className="messages-conversation-panel"
              aria-label="Your conversations"
            >
              <div className="messages-list-heading">
                <div>
                  <h2>Conversations</h2>
                  <span>
                    {conversations.length}{" "}
                    {conversations.length === 1 ? "chat" : "chats"}
                  </span>
                </div>
              </div>

              <label className="messages-search">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  placeholder="Search conversations..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search conversations"
                />
              </label>

              <div className="messages-conversation-list">
                {filteredConversations.length > 0 ? (
                  filteredConversations.map((conversation) => (
                    <button
                      type="button"
                      key={conversation.id}
                      className={`messages-conversation-item ${
                        activeId === conversation.id ? "active" : ""
                      }`}
                      onClick={() => openConversation(conversation)}
                      aria-pressed={activeId === conversation.id}
                    >
                      <span
                        className="messages-seller-avatar"
                        aria-hidden="true"
                      >
                        {conversation.initials}
                      </span>

                      <span className="messages-conversation-details">
                        <span className="messages-conversation-topline">
                          <strong>{conversation.seller}</strong>
                          <small>{conversation.time}</small>
                        </span>

                        <span className="messages-product-name">
                          {conversation.product}
                        </span>

                        <span className="messages-preview">
                          {conversation.preview}
                        </span>
                      </span>

                      {conversation.unread > 0 && (
                        <span
                          className="messages-unread-badge"
                          aria-label={`${conversation.unread} unread messages`}
                        >
                          {conversation.unread}
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="messages-list-empty">
                    <p>No conversations found.</p>
                    <span>Try another search term.</span>
                  </div>
                )}
              </div>
            </aside>

            <section
              className="messages-chat-panel"
              aria-label="Chat window"
            >
              {activeConversation ? (
                <>
                  <header className="messages-chat-header">
                    <button
                      type="button"
                      className="messages-back-button"
                      onClick={() => setMobileChatOpen(false)}
                      aria-label="Back to conversations"
                    >
                      ←
                    </button>

                    <span
                      className="messages-seller-avatar large"
                      aria-hidden="true"
                    >
                      {activeConversation.initials}
                    </span>

                    <div>
                      <h2>{activeConversation.seller}</h2>
                      <p>{activeConversation.product}</p>
                    </div>

                    <span className="messages-chat-label">Seller</span>
                  </header>

                  <div
                    className="messages-chat-body"
                    aria-label={`Conversation with ${activeConversation.seller}`}
                    aria-live="polite"
                  >
                    <div className="messages-date-divider">
                      <span>Conversation</span>
                    </div>

                    {activeConversation.messages.map((message) => (
                      <div
                        className={`messages-message-row ${
                          message.sentByCustomer ? "sent" : "received"
                        }`}
                        key={message.id}
                      >
                        <div className="messages-message-bubble">
                          <p>{message.text}</p>
                          <span>{message.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form
                    className="messages-compose"
                    onSubmit={sendMessage}
                    aria-label="Send a message"
                  >
                    <label
                      className="messages-compose-input"
                      htmlFor="customer-message-input"
                    >
                      <input
                        id="customer-message-input"
                        type="text"
                        value={messageInput}
                        onChange={(event) =>
                          setMessageInput(event.target.value)
                        }
                        placeholder="Write your message..."
                        autoComplete="off"
                        maxLength={2000}
                        aria-label="Write your message"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={!messageInput.trim()}
                    >
                      Send <span aria-hidden="true">↗</span>
                    </button>
                  </form>

                  <p className="messages-demo-note">
                    Demo mode — messages are not sent to the seller.
                  </p>
                </>
              ) : (
                <div className="messages-chat-empty">
                  <span aria-hidden="true">✉</span>
                  <h2>Select a conversation</h2>
                  <p>
                    Choose a seller from your conversations to read messages.
                  </p>
                </div>
              )}
            </section>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CustomerMessages;