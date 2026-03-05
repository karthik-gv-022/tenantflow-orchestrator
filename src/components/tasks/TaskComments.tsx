import { useState, useRef, useEffect } from 'react';
import { useComments, TaskComment } from '@/hooks/useComments';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Send, MoreHorizontal, Reply, Trash2, Edit, AtSign, Loader2 } from 'lucide-react';

interface TaskCommentsProps {
  taskId: string;
  className?: string;
}

export function TaskComments({ taskId, className }: TaskCommentsProps) {
  const { comments, isLoading, addComment, updateComment, deleteComment } = useComments(taskId);
  const { members } = useTeamMembers();
  const { user } = useAuth();
  
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[2]); // user_id is in the second capture group
    }
    return mentions;
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    
    const mentions = extractMentions(newComment);
    // Clean up mention format for display
    const cleanContent = newComment.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
    
    await addComment.mutateAsync({
      content: cleanContent,
      mentions,
      parentId: replyTo
    });
    
    setNewComment('');
    setReplyTo(null);
  };

  const handleEdit = async (id: string) => {
    if (!editContent.trim()) return;
    await updateComment.mutateAsync({ id, content: editContent });
    setEditingId(null);
    setEditContent('');
  };

  const handleMentionInsert = (member: { user_id: string; full_name: string | null; email: string }) => {
    const displayName = member.full_name || member.email;
    const mention = `@[${displayName}](${member.user_id}) `;
    setNewComment(prev => prev.replace(/@\w*$/, '') + mention);
    setShowMentions(false);
    setMentionFilter('');
    textareaRef.current?.focus();
  };

  const handleTextChange = (value: string) => {
    setNewComment(value);
    
    // Check if user is typing a mention
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = value.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(' ') && textAfterAt.length <= 20) {
        setShowMentions(true);
        setMentionFilter(textAfterAt.toLowerCase());
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const filteredMembers = members.filter(m => {
    const name = (m.full_name || m.email).toLowerCase();
    return name.includes(mentionFilter);
  });

  const renderComment = (comment: TaskComment, isReply = false) => {
    const isOwn = comment.user_id === user?.id;
    const isEditing = editingId === comment.id;

    return (
      <div
        key={comment.id}
        className={cn(
          'group flex gap-3',
          isReply && 'ml-10 mt-2'
        )}
      >
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {getInitials(comment.user?.full_name || null)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">
              {comment.user?.full_name || comment.user?.email || 'Unknown'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>
          
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleEdit(comment.id)}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          )}

          {!isEditing && (
            <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setReplyTo(comment.id)}
                >
                  <Reply className="w-3 h-3 mr-1" />
                  Reply
                </Button>
              )}
              {isOwn && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => {
                      setEditingId(comment.id);
                      setEditContent(comment.content);
                    }}>
                      <Edit className="w-3 h-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteComment.mutate(comment.id)}
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map(reply => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-4 pb-4">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            comments.map(comment => renderComment(comment))
          )}
        </div>
      </ScrollArea>

      {/* Reply indicator */}
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-t-lg border border-b-0">
          <Reply className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Replying to {comments.find(c => c.id === replyTo)?.user?.full_name || 'comment'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 px-2"
            onClick={() => setReplyTo(null)}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Comment input */}
      <div className="relative">
        {showMentions && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 bg-popover border rounded-lg shadow-lg mb-1 max-h-40 overflow-y-auto z-50">
            {filteredMembers.map(member => (
              <button
                key={member.id}
                className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted text-left"
                onClick={() => handleMentionInsert(member)}
              >
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs">
                    {getInitials(member.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{member.full_name || member.email}</span>
              </button>
            ))}
          </div>
        )}
        
        <div className={cn(
          'flex gap-2 border rounded-lg p-2',
          replyTo && 'rounded-t-none'
        )}>
          <Textarea
            ref={textareaRef}
            value={newComment}
            onChange={e => handleTextChange(e.target.value)}
            placeholder="Write a comment... Use @ to mention"
            rows={2}
            className="border-0 focus-visible:ring-0 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="flex flex-col gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                setNewComment(prev => prev + '@');
                setShowMentions(true);
                textareaRef.current?.focus();
              }}
            >
              <AtSign className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              className="h-8 w-8"
              onClick={handleSubmit}
              disabled={!newComment.trim() || addComment.isPending}
            >
              {addComment.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
