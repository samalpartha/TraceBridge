"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCase } from "@/lib/api-client";
import { Upload, X, Loader2, MapPin, Plus, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8005";

export function CaseIntakeForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showDescriptors, setShowDescriptors] = useState(false);
  const [formData, setFormData] = useState({
    person_name: "",
    age: "",
    gender: "",
    description: "",
    last_known_location: "",
    last_known_lat: "",
    last_known_lng: "",
    last_known_date: "",
    contact_info: "",
    // Structured identity descriptors
    scars: "",
    tattoos: "",
    dental_info: "",
    clothing: "",
    jewelry: "",
    aliases: "",
    hair_color: "",
    eye_color: "",
    height: "",
    weight: "",
    ethnicity: "",
    medical_conditions: "",
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.person_name.trim()) {
      toast.error("Person name is required");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("person_name", formData.person_name);
      if (formData.age) fd.append("age", formData.age);
      if (formData.gender) fd.append("gender", formData.gender);
      if (formData.description) fd.append("description", formData.description);
      if (formData.last_known_location) fd.append("last_known_location", formData.last_known_location);
      if (formData.last_known_lat) fd.append("last_known_lat", formData.last_known_lat);
      if (formData.last_known_lng) fd.append("last_known_lng", formData.last_known_lng);
      if (formData.last_known_date) fd.append("last_known_date", formData.last_known_date);
      if (formData.contact_info) fd.append("contact_info", formData.contact_info);
      // Structured descriptors — pack into JSON metadata
      const descriptors: Record<string, string> = {};
      for (const key of ["scars", "tattoos", "dental_info", "clothing", "jewelry", "aliases", "hair_color", "eye_color", "height", "weight", "ethnicity", "medical_conditions"] as const) {
        if (formData[key]) descriptors[key] = formData[key];
      }
      if (Object.keys(descriptors).length > 0) {
        fd.append("structured_descriptors", JSON.stringify(descriptors));
      }
      if (photo) fd.append("photo", photo);

      const result = await createCase(fd);
      toast.success("Case created successfully");
      router.push(`/cases/${result.id}`);
    } catch (err) {
      toast.error((err as Error).message || "Failed to create case");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGeocode = async () => {
    if (!formData.last_known_location.trim()) {
      toast.error("Enter a location first");
      return;
    }
    setGeocoding(true);
    try {
      const res = await fetch(
        `${API_URL}/api/geo/geocode?address=${encodeURIComponent(formData.last_known_location)}`
      );
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const r = data.results[0];
        setFormData((prev) => ({
          ...prev,
          last_known_lat: String(r.lat),
          last_known_lng: String(r.lng),
          last_known_location: r.formatted_address || prev.last_known_location,
        }));
        toast.success(`Location found: ${r.formatted_address}`);
      } else {
        toast.error("Could not find coordinates for that location");
      }
    } catch {
      toast.error("Geocoding failed. Check backend connection.");
    } finally {
      setGeocoding(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Photo Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Photo of Missing Person</CardTitle>
        </CardHeader>
        <CardContent>
          {preview ? (
            <div className="relative inline-block">
              <Image
                src={preview}
                alt="Preview"
                width={192}
                height={192}
                className="h-48 w-48 rounded-lg object-cover border"
              />
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setPreview(null);
                }}
                className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
                }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {isDragActive
                  ? "Drop the photo here..."
                  : "Drag & drop a photo, or click to select"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WebP up to 10MB
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Person Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Person Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="person_name">Full Name *</Label>
              <Input
                id="person_name"
                placeholder="Enter full name"
                value={formData.person_name}
                onChange={(e) => updateField("person_name", e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="Age"
                  value={formData.age}
                  onChange={(e) => updateField("age", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(v) => updateField("gender", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description / Distinguishing Features</Label>
            <Textarea
              id="description"
              placeholder="Physical description, clothing, distinguishing marks, etc."
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Structured Identity Descriptors */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Identity Descriptors
                <Badge variant="secondary" className="text-[10px] font-normal">Improves matching</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Structured attributes feed into the identity graph and enable description-based matching even without a photo.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDescriptors(!showDescriptors)}
              className="gap-1 text-xs"
            >
              {showDescriptors ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              {showDescriptors ? "Collapse" : "Expand"}
            </Button>
          </div>
        </CardHeader>
        {showDescriptors && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hair_color">Hair Color</Label>
                <Input
                  id="hair_color"
                  placeholder="e.g., Brown, short"
                  value={formData.hair_color}
                  onChange={(e) => updateField("hair_color", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eye_color">Eye Color</Label>
                <Input
                  id="eye_color"
                  placeholder="e.g., Blue"
                  value={formData.eye_color}
                  onChange={(e) => updateField("eye_color", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ethnicity">Ethnicity</Label>
                <Input
                  id="ethnicity"
                  placeholder="e.g., Hispanic, Asian"
                  value={formData.ethnicity}
                  onChange={(e) => updateField("ethnicity", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  placeholder="e.g., 5'8&quot; or 173cm"
                  value={formData.height}
                  onChange={(e) => updateField("height", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  placeholder="e.g., 160 lbs or 73kg"
                  value={formData.weight}
                  onChange={(e) => updateField("weight", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scars">Scars / Marks</Label>
                <Textarea
                  id="scars"
                  placeholder="e.g., 3-inch scar on left forearm, birthmark on right shoulder"
                  value={formData.scars}
                  onChange={(e) => updateField("scars", e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tattoos">Tattoos</Label>
                <Textarea
                  id="tattoos"
                  placeholder="e.g., Rose on left arm, name 'Maria' on wrist"
                  value={formData.tattoos}
                  onChange={(e) => updateField("tattoos", e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clothing">Clothing When Last Seen</Label>
                <Textarea
                  id="clothing"
                  placeholder="e.g., Blue jacket, white sneakers, red backpack"
                  value={formData.clothing}
                  onChange={(e) => updateField("clothing", e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jewelry">Jewelry / Accessories</Label>
                <Textarea
                  id="jewelry"
                  placeholder="e.g., Silver cross necklace, gold wedding band"
                  value={formData.jewelry}
                  onChange={(e) => updateField("jewelry", e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dental_info">Dental Information</Label>
                <Input
                  id="dental_info"
                  placeholder="e.g., Missing upper left molar, braces"
                  value={formData.dental_info}
                  onChange={(e) => updateField("dental_info", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aliases">Known Aliases / Nicknames</Label>
                <Input
                  id="aliases"
                  placeholder="e.g., Johnny, JP, El Flaco"
                  value={formData.aliases}
                  onChange={(e) => updateField("aliases", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="medical_conditions">Medical Conditions</Label>
              <Textarea
                id="medical_conditions"
                placeholder="e.g., Diabetes, requires insulin; epilepsy medication"
                value={formData.medical_conditions}
                onChange={(e) => updateField("medical_conditions", e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Location Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Last Known Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="last_known_location">Location Description</Label>
            <div className="flex gap-2">
              <Input
                id="last_known_location"
                placeholder="e.g., Houston, TX - near George R. Brown Convention Center"
                value={formData.last_known_location}
                onChange={(e) => updateField("last_known_location", e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGeocode}
                disabled={geocoding}
                className="gap-1.5 shrink-0"
              >
                {geocoding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MapPin className="h-3.5 w-3.5" />
                )}
                Lookup
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Click &quot;Lookup&quot; to auto-fill coordinates using Google Geocoding
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="last_known_lat">Latitude</Label>
              <Input
                id="last_known_lat"
                type="number"
                step="any"
                placeholder="29.7604"
                value={formData.last_known_lat}
                onChange={(e) => updateField("last_known_lat", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_known_lng">Longitude</Label>
              <Input
                id="last_known_lng"
                type="number"
                step="any"
                placeholder="-95.3698"
                value={formData.last_known_lng}
                onChange={(e) => updateField("last_known_lng", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_known_date">Date Last Seen</Label>
              <Input
                id="last_known_date"
                type="date"
                value={formData.last_known_date}
                onChange={(e) => updateField("last_known_date", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="contact_info">Phone / Email</Label>
            <Input
              id="contact_info"
              placeholder="How can we reach you?"
              value={formData.contact_info}
              onChange={(e) => updateField("contact_info", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Submitting Case...
          </>
        ) : (
          "Submit Missing Person Report"
        )}
      </Button>
    </form>
  );
}
