 import React, { useState, useEffect } from "react";
import { Site } from "@/types/asset";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Save, X } from "lucide-react";
import { logActivity } from "@/utils/activityLogger";

interface SiteFormProps {
  site?: Site | null;
  onSave: (site: Site) => void;
  onCancel: () => void;
  open: boolean;
}

const SiteForm = ({ site, onSave, onCancel, open }: SiteFormProps) => {
  const [formData, setFormData] = useState({
    name: site?.name || "",
    location: site?.location || "",
    description: site?.description || "",
    clientName: site?.clientName || "",
    contactPerson: site?.contactPerson || "",
    phone: site?.phone || "",
    service: site?.service || [] as ('dewatering' | 'waterproofing' | 'tiling' | 'sales' | 'repairs' | 'maintenance')[],
    status: site?.status || "active" as 'active' | 'inactive'
  });

  useEffect(() => {
    if (site) {
      setFormData({
        name: site.name,
        location: site.location,
        description: site.description || "",
        clientName: site.clientName || "",
        contactPerson: site.contactPerson || "",
        phone: site.phone || "",
        service: site.service || [],
        status: site.status || "active"
      });
    } else {
      setFormData({
        name: "",
        location: "",
        description: "",
        clientName: "",
        contactPerson: "",
        phone: "",
        service: [],
        status: "active"
      });
    }
  }, [site]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.location) {
      return;
    }
    const newSite: Site = {
      id: site?.id || Date.now().toString(),
      name: formData.name,
      location: formData.location,
      description: formData.description,
      clientName: formData.clientName,
      contactPerson: formData.contactPerson,
      phone: formData.phone,
      service: formData.service || undefined,
      status: formData.status,
      createdAt: site?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    onSave(newSite);

    // Log site creation if it's a new site
    if (!site) {
      logActivity({
        action: 'create',
        entity: 'site',
        entityId: newSite.id,
        details: `Added site ${newSite.name} at ${newSite.location}`
      });
    }
  };

  const isEditing = !!site;

  return (
    <Dialog open={open} onOpenChange={open ? () => {} : onCancel}>
      <DialogContent onClose={onCancel} className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="space-y-6 animate-fade-in">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {isEditing ? 'Edit Site' : 'Add New Site'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isEditing ? 'Update site information' : 'Add a new project site to your system'}
            </p>
          </div>

          <Card className="border-0 shadow-medium">
            <CardHeader>
              <CardTitle>Site Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Site Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Enter site name"
                      className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      placeholder="Enter site location"
                      className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Enter site description"
                    className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Client Name</Label>
                    <Input
                      id="clientName"
                      value={formData.clientName}
                      onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                      placeholder="Enter client name"
                      className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input
                      id="contactPerson"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                      placeholder="Enter contact person"
                      className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="Enter phone number"
                      className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: 'active' | 'inactive') =>
                        setFormData({...formData, status: value})
                      }
                    >
                      <SelectTrigger className="border-0 bg-muted/50 focus:bg-background transition-all duration-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Service Types</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { value: 'dewatering', label: 'Dewatering' },
                      { value: 'waterproofing', label: 'Waterproofing' },
                      { value: 'tiling', label: 'Tiling' },
                      { value: 'sales', label: 'Sales' },
                      { value: 'repairs', label: 'Repairs' },
                      { value: 'maintenance', label: 'Maintenance' }
                    ].map((service) => (
                      <div key={service.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={service.value}
                          checked={formData.service.includes(service.value as any)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                service: [...formData.service, service.value as any]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                service: formData.service.filter(s => s !== service.value)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={service.value} className="text-sm font-normal">
                          {service.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    className="flex-1 hover:bg-muted transition-all duration-300"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-primary hover:scale-105 transition-all duration-300 shadow-medium"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isEditing ? 'Update Site' : 'Add Site'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SiteForm;
