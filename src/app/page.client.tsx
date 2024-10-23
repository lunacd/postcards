"use client";

import { createClient } from "@supabase/supabase-js";
import { Database } from "@/app/database.types";
import { useEffect, useRef, useState } from "react";
import classNames from "classnames";

export default function HomeClient() {
  // Supabase client with anon key
  const supabase = createClient<Database>(
    "https://txwfltvwvmagcelpltby.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4d2ZsdHZ3dm1hZ2NlbHBsdGJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk2NDIwOTcsImV4cCI6MjA0NTIxODA5N30.PiZehmcqJM1QWLPJ5lZZDVqvSk-3TiM0NLtlTsCJlSg",
  );
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const postcardRef = useRef<HTMLDivElement>(null);
  const receivedPostcardRef = useRef<HTMLDivElement>(null);
  const [uploadCompleted, setUploadCompleted] = useState<boolean>(false);
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [animationFinished, setAnimationFinished] = useState<boolean>(false);

  useEffect(() => {
    if (!uploadedImage) return;
    const objectUrl = URL.createObjectURL(uploadedImage);
    setUploadedImageUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [uploadedImage]);

  useEffect(() => {
    if (animationFinished && uploadCompleted) {
      receivedPostcardRef.current!.getAnimations()[0].play();
    }
  }, [animationFinished, uploadCompleted]);

  return (
    <>
      <div
        className="relative h-full w-full outro-animation"
        ref={postcardRef}
        onAnimationEnd={() => {
          setAnimationFinished(true);
        }}
      >
        {!uploadCompleted && (
          <>
            <div
              className="postcard-container"
              style={{
                aspectRatio: "3/2",
                maxWidth: "53.6%",
                maxHeight: "80%",
              }}
            >
              <div className="relative flex items-center justify-center overflow-hidden">
                {uploadedImageUrl.length > 0 && (
                  <img
                    src={uploadedImageUrl}
                    alt="Postcard image"
                    className="image"
                  />
                )}

                <div
                  className={classNames("button relative cursor-pointer", {
                    hidden: uploadedImageUrl.length !== 0,
                  })}
                >
                  Upload picture
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    ref={fileRef}
                    className="absolute opacity-0 w-full h-full left-0 top-0 cursor-pointer"
                    onChange={(event) => {
                      if (event.target.files && event.target.files.length > 0) {
                        setUploadedImage(event.target.files[0]);
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <textarea
                  ref={textAreaRef}
                  className="border-gray-950 border rounded-lg p-4 flex-grow"
                />

                <button
                  className="button self-end"
                  onClick={async () => {
                    // Start outro animation
                    if (!postcardRef.current) return;
                    postcardRef.current.getAnimations()[0].play();

                    // Validate input
                    if (!textAreaRef.current || !fileRef.current) {
                      return;
                    }
                    if (textAreaRef.current.value.length === 0) {
                      return;
                    }
                    if (
                      !fileRef.current.files ||
                      fileRef.current.files.length === 0
                    ) {
                      return;
                    }

                    // Store text into database
                    const extension = fileRef.current.value.split(".").pop()!;
                    const { error: dbError, data: insertedRows } =
                      await supabase
                        .from("postcards")
                        .insert({
                          text: textAreaRef.current.value,
                          ext: extension,
                        })
                        .select();
                    const id = insertedRows![0].id;
                    if (dbError) {
                      console.error(dbError);
                    }

                    // Upload image
                    const { error: storageError } = await supabase.storage
                      .from("postcards")
                      .upload(`${id}.${extension}`, fileRef.current.files[0], {
                        upsert: true,
                      });
                    if (storageError) {
                      console.error(storageError);
                    }

                    // Get random text and image
                    const { data: retrievedRows } = await supabase.rpc(
                      "get_random_postcard",
                      { excludeid: id },
                    );
                    const retrieved = retrievedRows![0];
                    setText(retrieved.text);
                    const { data: imageData } = supabase.storage
                      .from("postcards")
                      .getPublicUrl(`${retrieved.id}.${retrieved.ext}`);
                    setImage(imageData.publicUrl);
                    setUploadCompleted(true);
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <div
        className="absolute w-full h-full left-0 top-0 intro-animation"
        ref={receivedPostcardRef}
      >
        <div className="postcard-container">
          <div className="w-full h-full overflow-hidden">
            <img src={image} alt="Retrieved postcard image" className="image" />
          </div>
          <div className="overflow-y-auto">{text}</div>
        </div>
      </div>
    </>
  );
}
