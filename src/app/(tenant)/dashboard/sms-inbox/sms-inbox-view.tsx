"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, User, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { sendSmsReply } from "./actions";

interface Message {
  id: string;
  senderType: string;
  message: string;
  createdAt: string | Date;
  orderNumber: string;
}

interface Conversation {
  customer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    email: string;
  };
  messages: Message[];
  lastMessageAt: string | Date;
  unreadCount: number;
}

export function SmsInboxView({
  conversations,
}: {
  conversations: Conversation[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConv = conversations.find(
    (c) => c.customer.id === selected
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConv?.messages.length]);

  const handleSendReply = () => {
    if (!selected || !replyText.trim()) return;
    setError("");

    startTransition(async () => {
      try {
        await sendSmsReply({
          customerId: selected,
          message: replyText.trim(),
        });
        setReplyText("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send");
      }
    });
  };

  const customerName = (c: Conversation["customer"]) =>
    c.firstName
      ? `${c.firstName}${c.lastName ? ` ${c.lastName}` : ""}`
      : c.email;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SMS Inbox</h1>
        <p className="text-muted-foreground">
          View and reply to customer SMS messages
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 min-h-[600px]">
        {/* Conversation List */}
        <Card className={cn("lg:col-span-1", selected && "hidden lg:block")}>
          <CardHeader>
            <CardTitle className="text-base">
              Conversations ({conversations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No SMS conversations yet.</p>
              </div>
            ) : (
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {conversations.map((conv) => (
                  <button
                    key={conv.customer.id}
                    onClick={() => setSelected(conv.customer.id)}
                    className={cn(
                      "w-full text-left p-4 hover:bg-muted/50 transition-colors",
                      selected === conv.customer.id && "bg-muted"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {customerName(conv.customer)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.customer.phone}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {conv.messages[0]?.message}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-muted-foreground">
                          {formatRelativeTime(conv.lastMessageAt)}
                        </span>
                        {conv.unreadCount > 0 && (
                          <Badge variant="default" className="text-[10px] h-5 min-w-5 justify-center">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Thread */}
        <Card className={cn("lg:col-span-2", !selected && "hidden lg:block")}>
          {selectedConv ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setSelected(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <User className="h-8 w-8 rounded-full bg-muted p-1.5" />
                  <div>
                    <p className="font-medium text-sm">
                      {customerName(selectedConv.customer)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedConv.customer.phone}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0 flex flex-col h-[450px]">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {[...selectedConv.messages].reverse().map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.senderType === "customer"
                          ? "justify-start"
                          : "justify-end"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] rounded-lg px-3 py-2",
                          msg.senderType === "customer"
                            ? "bg-muted"
                            : "bg-primary text-primary-foreground"
                        )}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] opacity-70">
                            {new Date(msg.createdAt).toLocaleString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                          <span className="text-[10px] opacity-50">
                            {msg.orderNumber}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Input */}
                <div className="border-t p-4">
                  {error && (
                    <p className="text-xs text-destructive mb-2">{error}</p>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                      maxLength={1600}
                      disabled={isPending}
                    />
                    <Button
                      onClick={handleSendReply}
                      disabled={isPending || !replyText.trim()}
                      size="icon"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {replyText.length}/1600 characters
                  </p>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Select a conversation to view messages</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
