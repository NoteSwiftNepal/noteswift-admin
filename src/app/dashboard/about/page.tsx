import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, Linkedin, Twitter, Globe, Instagram } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold font-headline tracking-tight">About This Software</h1>
        <p className="text-muted-foreground mt-2">Information about the developer and terms of use.</p>
      </div>

      <Card className="shadow-md">
        <CardHeader className="items-center text-center">
            <Image 
                src="/assets/cls.png" 
                alt="Codelits Studio Logo"
                data-ai-hint="company logo"
                width={100}
                height={100}
                className="rounded-full border-4 border-primary/10 shadow-lg"
            />
            <CardTitle className="text-3xl font-headline mt-4">Codelits Studio Pvt. Ltd.®</CardTitle>
            <CardDescription>Innovating the Future, One Line of Code at a Time.</CardDescription>
            <div className="flex justify-center items-center gap-4 pt-4">
                 <Link href="https://github.com/codelitsstudio/" className="text-muted-foreground hover:text-primary transition-colors"><Github className="w-5 h-5" /></Link>
                 <Link href="https://linkedin.com/company/codelits-studio" className="text-muted-foreground hover:text-primary transition-colors"><Linkedin className="w-5 h-5" /></Link>
                 <Link href="https://www.instagram.com/codelits_studio/" className="text-muted-foreground hover:text-primary transition-colors"><Instagram className="w-5 h-5" /></Link>
                 <Link href="https://codelitsstudio.com/" className="text-muted-foreground hover:text-primary transition-colors"><Globe className="w-5 h-5" /></Link>
             </div>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Software Ownership & Usage Rights</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                This software, NoteSwift Admin, is the exclusive intellectual property of <strong>Codelits Studio Pvt. Ltd.®</strong>. 
                As per our contractual agreement, NoteSwift is granted a license to use this web application for its business operations. 
                However, NoteSwift is not permitted to solely modify, manipulate, misuse, or redistribute this software to any third party without prior written consent from Codelits Studio. 
                All modifications, updates, and distribution to other clients will be handled exclusively by Codelits Studio Pvt. Ltd.®
                </p>
            </CardContent>
        </Card>

        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Terms of Service</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                By accessing and using the NoteSwift Admin panel, you agree to be bound by the terms and conditions set forth by Codelits Studio Pvt. Ltd. Unauthorized access, distribution, or modification of this software is strictly prohibited and may result in legal action. The use of this software is subject to the service level agreement (SLA) between Codelits Studio Pvt. Ltd. and NoteSwift.
                </p>
            </CardContent>
        </Card>

        <Card className="shadow-md md:col-span-2">
            <CardHeader>
                <CardTitle>Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                Codelits Studio Pvt. Ltd. is committed to protecting your privacy. Any data collected through the use of this software is handled in accordance with our data protection policies and the GDPR. We do not share any user data with third parties without explicit consent, except as required by law. All data related to the NoteSwift platform is owned by NoteSwift, and Codelits Studio acts as a data processor. For more details, please refer to our full privacy policy document.
                </p>
            </CardContent>
        </Card>
      </div>
       <footer className="mt-12 text-center text-xs text-muted-foreground pb-4">
        © 2025 Codelits Studio Pvt. Ltd.® — All rights reserved.
      </footer>
    </div>
  );
}
