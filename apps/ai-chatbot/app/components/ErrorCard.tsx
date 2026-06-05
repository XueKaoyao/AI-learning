'use client';
import { CloseCircleFilled, ReloadOutlined } from '@ant-design/icons';

interface Props {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export default function ErrorCard({ message, onRetry, onDismiss }: Props) {
  return (
    <div className="w-2/3 mx-auto animate-fade-in my-5">
      <div className="flex items-start gap-3 rounded-xl border border-red-200/60 bg-red-50/90 px-5 py-4 shadow-sm backdrop-blur-sm dark:border-red-800/40 dark:bg-red-950/60">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <CloseCircleFilled style={{ color: 'black' }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">
            出错了
          </p>
          <p className="mt-1 text-sm text-red-600/80 dark:text-red-400/70 break-words line-clamp-3">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-1">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors dark:text-red-400 dark:hover:bg-red-900/50 cursor-pointer"
            >
              <ReloadOutlined />
              重试
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="inline-flex items-center rounded-lg p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors dark:hover:text-red-300 dark:hover:bg-red-900/50 cursor-pointer"
              aria-label="关闭"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M2 2l10 10M12 2L2 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
