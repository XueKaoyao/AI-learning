import { type ReactElement } from 'react';
import { GetProp, message, MessageArgsProps } from 'antd';

type MessageState = {
  contextHolder: ReactElement;
  successFn: (content: string) => void;
  errorFn: (content: string) => void;
};

const defaultStyles: GetProp<MessageArgsProps, 'styles', 'Return'> = {
  root: {
    backgroundColor: '#f6ffed',
    border: '2px solid #95de64',
    borderRadius: 16,
  },
  icon: {
    color: '#237804',
  },
  title: {
    color: '#237804',
    fontWeight: 600,
  },
};

const stylesFn: MessageArgsProps['styles'] = ({
  props,
}): GetProp<MessageArgsProps, 'styles', 'Return'> => {
  if (props.type === 'error') {
    return {
      root: {
        ...defaultStyles.root,
        backgroundColor: '#fff2f0',
        borderColor: '#ffccc7',
      },
      icon: {
        color: '#cf1322',
      },
      title: {
        color: '#cf1322',
        fontWeight: 600,
      },
    };
  }
  return defaultStyles;
};

export default function useMessageComponent(): MessageState {
  const [messageApi, contextHolder] = message.useMessage();
  const successFn = (content: string) => {
    messageApi.open({
      type: 'success',
      content: content,
      styles: defaultStyles,
    });
  };
  const errorFn = (content: string) => {
    messageApi.open({
      type: 'error',
      content: content,
      styles: stylesFn,
    });
  };
  return { contextHolder, successFn, errorFn };
}
