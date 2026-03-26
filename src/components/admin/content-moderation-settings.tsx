"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function ContentModerationSettings() {
  const [autoModerate, setAutoModerate] = useState(true);
  const [profanityFilter, setProfanityFilter] = useState(true);
  const [spamDetection, setSpamDetection] = useState(true);
  const [imageModeration, setImageModeration] = useState(false);
  const [maxFileSize, setMaxFileSize] = useState("10");
  const [allowedFileTypes, setAllowedFileTypes] = useState("pdf,doc,docx,ppt,pptx");
  const [bannedWords, setBannedWords] = useState("");
  const [contentReviewRequired, setContentReviewRequired] = useState(false);
  const [copyrightCheck, setCopyrightCheck] = useState(false);

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log("Saving content moderation settings...");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label>Automated Moderation</Label>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Auto-Moderate Content</Label>
            <p className="text-sm text-muted-foreground">
              Automatically flag suspicious content for review
            </p>
          </div>
          <Switch checked={autoModerate} onCheckedChange={setAutoModerate} />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Profanity Filter</Label>
            <p className="text-sm text-muted-foreground">
              Filter out profane language in content
            </p>
          </div>
          <Switch checked={profanityFilter} onCheckedChange={setProfanityFilter} />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Spam Detection</Label>
            <p className="text-sm text-muted-foreground">
              Detect and prevent spam content
            </p>
          </div>
          <Switch checked={spamDetection} onCheckedChange={setSpamDetection} />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Image Moderation</Label>
            <p className="text-sm text-muted-foreground">
              Moderate uploaded images for inappropriate content
            </p>
          </div>
          <Switch checked={imageModeration} onCheckedChange={setImageModeration} />
        </div>
      </div>

      <div className="space-y-4">
        <Label>File Upload Restrictions</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Max File Size (MB)</Label>
            <Input
              type="number"
              value={maxFileSize}
              onChange={(e) => setMaxFileSize(e.target.value)}
            />
          </div>
          <div>
            <Label>Allowed File Types</Label>
            <Input
              value={allowedFileTypes}
              onChange={(e) => setAllowedFileTypes(e.target.value)}
              placeholder="pdf,doc,docx,ppt,pptx"
            />
          </div>
        </div>
      </div>

      <div>
        <Label>Banned Words/Phrases (comma-separated)</Label>
        <Textarea
          value={bannedWords}
          onChange={(e) => setBannedWords(e.target.value)}
          placeholder="word1, word2, phrase1, phrase2"
          rows={3}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Content Review Required</Label>
            <p className="text-sm text-muted-foreground">
              All content must be reviewed before publishing
            </p>
          </div>
          <Switch checked={contentReviewRequired} onCheckedChange={setContentReviewRequired} />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Copyright Check</Label>
            <p className="text-sm text-muted-foreground">
              Check content for copyright violations
            </p>
          </div>
          <Switch checked={copyrightCheck} onCheckedChange={setCopyrightCheck} />
        </div>
      </div>

      <Button onClick={handleSave} className="w-full">
        Save Content Moderation Settings
      </Button>
    </div>
  );
}