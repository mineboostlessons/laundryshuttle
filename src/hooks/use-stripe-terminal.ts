"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface TerminalStatus {
  isConnected: boolean;
  isLoading: boolean;
  readerLabel: string | null;
  error: string | null;
}

interface UseStripeTerminalReturn {
  status: TerminalStatus;
  discoverReaders: () => Promise<void>;
  connectReader: (reader: StripeTerminalReader) => Promise<void>;
  disconnectReader: () => Promise<void>;
  collectPayment: (clientSecret: string) => Promise<CollectResult>;
  cancelCollect: () => Promise<void>;
  availableReaders: StripeTerminalReader[];
}

interface StripeTerminalReader {
  id: string;
  label: string;
  status: string;
  device_type: string;
  serial_number: string;
}

interface CollectResult {
  success: boolean;
  paymentIntent?: { id: string; status: string };
  error?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StripeTerminalInstance = any;

export function useStripeTerminal(): UseStripeTerminalReturn {
  const [status, setStatus] = useState<TerminalStatus>({
    isConnected: false,
    isLoading: false,
    readerLabel: null,
    error: null,
  });
  const [availableReaders, setAvailableReaders] = useState<
    StripeTerminalReader[]
  >([]);
  const terminalRef = useRef<StripeTerminalInstance>(null);
  const initialized = useRef(false);

  // Initialize the Terminal SDK
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function initTerminal() {
      try {
        const { loadStripeTerminal } = await import("@stripe/terminal-js");

        const StripeTerminal = await loadStripeTerminal();
        if (!StripeTerminal) {
          setStatus((prev) => ({
            ...prev,
            error: "Failed to load Stripe Terminal SDK",
          }));
          return;
        }

        terminalRef.current = StripeTerminal.create({
          onFetchConnectionToken: async () => {
            const res = await fetch("/api/stripe/terminal/connection-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            return data.data.secret;
          },
          onUnexpectedReaderDisconnect: () => {
            setStatus((prev) => ({
              ...prev,
              isConnected: false,
              readerLabel: null,
              error: "Reader disconnected unexpectedly",
            }));
          },
        });
      } catch (err) {
        setStatus((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Terminal init failed",
        }));
      }
    }

    initTerminal();
  }, []);

  const discoverReaders = useCallback(async () => {
    if (!terminalRef.current) return;

    setStatus((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await terminalRef.current.discoverReaders({
        simulated: process.env.NODE_ENV === "development",
      });

      if ("error" in result && result.error) {
        setStatus((prev) => ({
          ...prev,
          isLoading: false,
          error: result.error.message,
        }));
        return;
      }

      setAvailableReaders(result.discoveredReaders ?? []);
      setStatus((prev) => ({ ...prev, isLoading: false }));
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        isLoading: false,
        error:
          err instanceof Error ? err.message : "Failed to discover readers",
      }));
    }
  }, []);

  const connectReader = useCallback(
    async (reader: StripeTerminalReader) => {
      if (!terminalRef.current) return;

      setStatus((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const result = await terminalRef.current.connectReader(reader);

        if ("error" in result && result.error) {
          setStatus((prev) => ({
            ...prev,
            isLoading: false,
            error: result.error.message,
          }));
          return;
        }

        setStatus({
          isConnected: true,
          isLoading: false,
          readerLabel: reader.label || reader.serial_number,
          error: null,
        });
      } catch (err) {
        setStatus((prev) => ({
          ...prev,
          isLoading: false,
          error:
            err instanceof Error ? err.message : "Failed to connect reader",
        }));
      }
    },
    []
  );

  const disconnectReader = useCallback(async () => {
    if (!terminalRef.current) return;
    try {
      await terminalRef.current.disconnectReader();
      setStatus({
        isConnected: false,
        isLoading: false,
        readerLabel: null,
        error: null,
      });
    } catch {
      // Ignore disconnect errors
    }
  }, []);

  const collectPayment = useCallback(
    async (clientSecret: string): Promise<CollectResult> => {
      if (!terminalRef.current) {
        return { success: false, error: "Terminal not initialized" };
      }

      try {
        setStatus((prev) => ({ ...prev, isLoading: true, error: null }));

        const collectResult =
          await terminalRef.current.collectPaymentMethod(clientSecret);

        if ("error" in collectResult && collectResult.error) {
          setStatus((prev) => ({ ...prev, isLoading: false }));
          return { success: false, error: collectResult.error.message };
        }

        const processResult = await terminalRef.current.processPayment(
          collectResult.paymentIntent
        );

        setStatus((prev) => ({ ...prev, isLoading: false }));

        if ("error" in processResult && processResult.error) {
          return { success: false, error: processResult.error.message };
        }

        return {
          success: true,
          paymentIntent: {
            id: processResult.paymentIntent.id,
            status: processResult.paymentIntent.status,
          },
        };
      } catch (err) {
        setStatus((prev) => ({ ...prev, isLoading: false }));
        return {
          success: false,
          error:
            err instanceof Error ? err.message : "Payment collection failed",
        };
      }
    },
    []
  );

  const cancelCollect = useCallback(async () => {
    if (!terminalRef.current) return;
    try {
      await terminalRef.current.cancelCollectPaymentMethod();
    } catch {
      // Ignore cancel errors
    }
    setStatus((prev) => ({ ...prev, isLoading: false }));
  }, []);

  return {
    status,
    discoverReaders,
    connectReader,
    disconnectReader,
    collectPayment,
    cancelCollect,
    availableReaders,
  };
}
