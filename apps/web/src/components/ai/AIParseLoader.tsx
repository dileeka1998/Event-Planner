import { Bot } from 'lucide-react';

interface AIParseLoaderProps {
  message?: string;
}

export function AIParseLoader({ message = 'AI is analyzing your event...' }: AIParseLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F6AB4] to-[#28A9A1] rounded-full animate-ping opacity-25"></div>
        <div className="relative bg-gradient-to-br from-[#0F6AB4] to-[#28A9A1] rounded-full p-4">
          <Bot className="w-8 h-8 text-white animate-pulse" />
        </div>
      </div>
      <p className="text-sm text-gray-600 animate-pulse">{message}</p>
    </div>
  );
}
