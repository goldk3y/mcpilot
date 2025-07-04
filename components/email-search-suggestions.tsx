import { useState, } from 'react';
import { Command, CommandInput, CommandList, CommandItem, CommandGroup } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Search, Clock, Filter, User, Calendar, Paperclip } from 'lucide-react';

interface SearchSuggestion {
  type: 'history' | 'template' | 'contact' | 'label';
  value: string;
  display: string;
  icon: React.ReactNode;
  description?: string;
}

interface EmailSearchSuggestionsProps {
  onSearch: (query: string) => void;
  recentSearches?: string[];
  contacts?: Array<{ name: string; email: string }>;
  labels?: Array<{ name: string; id: string }>;
}

export function EmailSearchSuggestions({ 
  onSearch, 
  recentSearches = [],
  contacts = [],
  labels = []
}: EmailSearchSuggestionsProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  const commonSearchTemplates = [
    { query: 'is:unread', display: 'Unread emails', icon: <Filter className="size-4" /> },
    { query: 'has:attachment', display: 'Emails with attachments', icon: <Paperclip className="size-4" /> },
    { query: 'is:important', display: 'Important emails', icon: <Filter className="size-4" /> },
    { query: `after:${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`, display: 'Last 7 days', icon: <Calendar className="size-4" /> },
    { query: 'is:starred', display: 'Starred emails', icon: <Filter className="size-4" /> },
  ];

  const suggestions: SearchSuggestion[] = [
    ...recentSearches.map(search => ({
      type: 'history' as const,
      value: search,
      display: search,
      icon: <Clock className="size-4" />,
      description: 'Recent search'
    })),
    ...commonSearchTemplates.map(template => ({
      type: 'template' as const,
      value: template.query,
      display: template.display,
      icon: template.icon,
    })),
    ...contacts.slice(0, 5).map(contact => ({
      type: 'contact' as const,
      value: `from:${contact.email}`,
      display: `Emails from ${contact.name}`,
      icon: <User className="size-4" />,
      description: contact.email
    })),
    ...labels.slice(0, 5).map(label => ({
      type: 'label' as const,
      value: `label:${label.name}`,
      display: `${label.name} emails`,
      icon: <Filter className="size-4" />,
    })),
  ];

  const handleSelect = (suggestion: SearchSuggestion) => {
    setValue(suggestion.value);
    onSearch(suggestion.value);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Search className="size-4" />
            <span className="text-muted-foreground">
              {value || "Search emails..."}
            </span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search emails..." 
            value={value}
            onValueChange={setValue}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' && value) {
                onSearch(value);
                setOpen(false);
              }
            }}
          />
          <CommandList>
            {recentSearches.length > 0 && (
              <CommandGroup heading="Recent Searches">
                {suggestions.filter(s => s.type === 'history').map((suggestion) => (
                  <CommandItem
                    key={`history-${suggestion.value}`}
                    onSelect={() => handleSelect(suggestion)}
                    className="flex items-center gap-2"
                  >
                    {suggestion.icon}
                    <span>{suggestion.display}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            
            <CommandGroup heading="Quick Searches">
              {suggestions.filter(s => s.type === 'template').map((suggestion) => (
                <CommandItem
                  key={`template-${suggestion.value}`}
                  onSelect={() => handleSelect(suggestion)}
                  className="flex items-center gap-2"
                >
                  {suggestion.icon}
                  <span>{suggestion.display}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            {contacts.length > 0 && (
              <CommandGroup heading="Contacts">
                {suggestions.filter(s => s.type === 'contact').map((suggestion) => (
                  <CommandItem
                    key={`contact-${suggestion.value}`}
                    onSelect={() => handleSelect(suggestion)}
                    className="flex items-center gap-2"
                  >
                    {suggestion.icon}
                    <div className="flex flex-col">
                      <span>{suggestion.display}</span>
                      {suggestion.description && (
                        <span className="text-xs text-muted-foreground">{suggestion.description}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {labels.length > 0 && (
              <CommandGroup heading="Labels">
                {suggestions.filter(s => s.type === 'label').map((suggestion) => (
                  <CommandItem
                    key={`label-${suggestion.value}`}
                    onSelect={() => handleSelect(suggestion)}
                    className="flex items-center gap-2"
                  >
                    {suggestion.icon}
                    <span>{suggestion.display}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 