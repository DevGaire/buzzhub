"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function DebugMediaPage() {
  const [mediaData, setMediaData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchMediaData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/debug-media");
      const data = await response.json();
      setMediaData(data);
    } catch (error) {
      console.error("Error fetching media data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMediaData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl">
        <CardHeader>
          <CardTitle>🖼️ Debug Media Attachments</CardTitle>
          <CardDescription>
            View all posts with media attachments and their URLs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={fetchMediaData} disabled={loading} className="w-full">
            {loading ? "Loading..." : "🔄 Refresh Media Data"}
          </Button>

          {mediaData && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-800">📊 Media Summary</h3>
                <p className="text-blue-700">Total Posts with Media: <strong>{mediaData.totalPostsWithMedia}</strong></p>
              </div>

              {mediaData.totalPostsWithMedia === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-medium text-yellow-800">⚠️ No Media Found</h3>
                  <p className="text-yellow-700">
                    No posts with media attachments found. Try creating a post with an image to test.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-medium">📝 Posts with Media:</h3>
                  {mediaData.posts.map((post: any, index: number) => (
                    <div key={post.postId} className="border rounded-lg p-4 bg-white">
                      <div className="mb-3">
                        <h4 className="font-medium">Post #{index + 1}</h4>
                        <p className="text-sm text-gray-600">
                          <strong>User:</strong> @{post.user} | 
                          <strong> Created:</strong> {new Date(post.createdAt).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Content:</strong> {post.content}
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        <h5 className="font-medium text-sm">Media Attachments ({post.attachments.length}):</h5>
                        {post.attachments.map((media: any, mediaIndex: number) => (
                          <div key={media.id} className="border rounded p-3 bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p><strong>Media #{mediaIndex + 1}</strong></p>
                                <p><strong>ID:</strong> {media.id}</p>
                                <p><strong>Type:</strong> 
                                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                                    media.type === 'IMAGE' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {media.type}
                                  </span>
                                </p>
                                <p><strong>URL Valid:</strong> 
                                  <span className={`ml-2 ${media.urlValid ? 'text-green-600' : 'text-red-600'}`}>
                                    {media.urlValid ? '✅ Yes' : '❌ No'}
                                  </span>
                                </p>
                                <p><strong>UploadThing URL:</strong> 
                                  <span className={`ml-2 ${media.isUploadThingUrl ? 'text-green-600' : 'text-red-600'}`}>
                                    {media.isUploadThingUrl ? '✅ Yes' : '❌ No'}
                                  </span>
                                </p>
                                <p><strong>Created:</strong> {new Date(media.createdAt).toLocaleString()}</p>
                                <div className="mt-2">
                                  <p><strong>Full URL:</strong></p>
                                  <p className="text-xs font-mono bg-white p-2 rounded border break-all">
                                    {media.url}
                                  </p>
                                </div>
                              </div>
                              
                              <div>
                                <p className="font-medium mb-2">Preview:</p>
                                {media.type === 'IMAGE' ? (
                                  <div className="space-y-2">
                                    <Image
                                      src={media.url}
                                      alt="Media preview"
                                      width={200}
                                      height={200}
                                      className="rounded border max-h-48 object-cover"
                                      onError={(e) => {
                                        console.error('Image failed to load:', media.url);
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                      onLoad={() => {
                                        console.log('Image loaded successfully:', media.url);
                                      }}
                                    />
                                    <p className="text-xs text-gray-500">
                                      If image doesn't show, check browser console for errors
                                    </p>
                                  </div>
                                ) : (
                                  <video
                                    src={media.url}
                                    controls
                                    className="rounded border max-h-48"
                                    onError={(e) => {
                                      console.error('Video failed to load:', media.url);
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>What this shows:</strong></p>
            <ul className="text-xs space-y-1 ml-4">
              <li>• All posts with media attachments</li>
              <li>• Media URLs and their validity</li>
              <li>• Image/video previews to test loading</li>
              <li>• UploadThing URL format verification</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}