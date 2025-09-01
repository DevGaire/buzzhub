"use client";

import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Monitor, Moon, Sun, Palette, Type, Layout } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [fontSize, setFontSize] = useState([16]);
  const [compactMode, setCompactMode] = useState(false);
  const [animations, setAnimations] = useState(true);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>
            Choose how Buzzhub looks to you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={theme} onValueChange={setTheme}>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="light" id="light" />
              <Label htmlFor="light" className="flex items-center gap-2 cursor-pointer">
                <Sun className="h-4 w-4" />
                <div>
                  <p className="font-medium">Light</p>
                  <p className="text-sm text-muted-foreground">
                    Bright theme for daytime use
                  </p>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="dark" id="dark" />
              <Label htmlFor="dark" className="flex items-center gap-2 cursor-pointer">
                <Moon className="h-4 w-4" />
                <div>
                  <p className="font-medium">Dark</p>
                  <p className="text-sm text-muted-foreground">
                    Dark theme for night time use
                  </p>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="system" id="system" />
              <Label htmlFor="system" className="flex items-center gap-2 cursor-pointer">
                <Monitor className="h-4 w-4" />
                <div>
                  <p className="font-medium">System</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically match your system settings
                  </p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Display</CardTitle>
          <CardDescription>
            Customize your viewing experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              <Label>Font Size</Label>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Aa</span>
              <Slider
                value={fontSize}
                onValueChange={setFontSize}
                min={14}
                max={20}
                step={1}
                className="flex-1"
              />
              <span className="text-lg text-muted-foreground">Aa</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Current size: {fontSize[0]}px
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Layout className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="compact-mode">Compact Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Show more content with less spacing
                </p>
              </div>
            </div>
            <Switch
              id="compact-mode"
              checked={compactMode}
              onCheckedChange={setCompactMode}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="animations">Animations</Label>
                <p className="text-sm text-muted-foreground">
                  Enable smooth transitions and effects
                </p>
              </div>
            </div>
            <Switch
              id="animations"
              checked={animations}
              onCheckedChange={setAnimations}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Color Scheme</CardTitle>
          <CardDescription>
            Choose your accent color
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2">
            {[
              "bg-blue-500",
              "bg-purple-500",
              "bg-pink-500",
              "bg-red-500",
              "bg-orange-500",
              "bg-yellow-500",
              "bg-green-500",
              "bg-teal-500",
              "bg-cyan-500",
              "bg-indigo-500",
              "bg-gray-500",
              "bg-slate-500",
            ].map((color) => (
              <button
                key={color}
                className={`h-10 w-10 rounded-lg ${color} hover:scale-110 transition-transform`}
                onClick={() => {
                  // Handle color change
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Button className="w-full">
        Apply Changes
      </Button>
    </div>
  );
}