import { Card, Radio } from 'antd';
import { useState, useRef, useEffect } from 'react';
import { useSystemOption } from '../store/useSystemOption';
import { SystemPromptOption } from '../types/systemPromptType';
import useFetchPrompts from '../hooks/useFetchPrompts';
import throttle from 'lodash/throttle';

export default function SystemPromptItems({
  setPendingSystemPrompt,
}: {
  setPendingSystemPrompt: (prompt: SystemPromptOption) => void;
}) {
  const { systemPrompt } = useSystemOption();
  const { results } = useFetchPrompts();
  const [selectedValue, setSelectedValue] = useState<string>(systemPrompt.id);
  const throttledSelectRef = useRef<ReturnType<typeof throttle> | null>(null);

  if (throttledSelectRef.current === null) {
    throttledSelectRef.current = throttle(
      (option: SystemPromptOption) => setPendingSystemPrompt(option),
      1000,
    );
  }

  useEffect(() => {
    return () => throttledSelectRef.current?.cancel();
  }, []);

  return (
    <Radio.Group
      value={selectedValue}
      onChange={(e) => setSelectedValue(e.target.value)}
    >
      {results.map((option) => {
        const isSelected = selectedValue === option.id;
        return (
          <Card
            key={option.id}
            hoverable
            onClick={() => {
              setSelectedValue(option.id);
              throttledSelectRef.current?.(option);
            }}
            styles={{
              root: {
                margin: 15,
                border: isSelected ? '1px solid #3b82f6' : '1px solid #e5e7eb',
              },
              body: {
                padding: 0,
              },
            }}
          >
            <Radio
              value={option.id}
              className="w-full"
              styles={{ root: { padding: '20px' } }}
            >
              {option.description}
            </Radio>
          </Card>
        );
      })}
    </Radio.Group>
  );
}
