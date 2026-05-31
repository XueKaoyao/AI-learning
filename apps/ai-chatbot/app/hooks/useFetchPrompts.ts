import { useEffect, useState } from 'react';
import { SystemPromptOption } from '../types/systemPromptType';

export default function useFetchPrompts() {
  const [results, setResults] = useState<SystemPromptOption[]>([]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/systemprompt');
        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.error('Error fetching system prompts:', error);
      }
    };
    fetchData();
  }, []);
  return { results };
}
