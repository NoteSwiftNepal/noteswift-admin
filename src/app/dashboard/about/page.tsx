import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, Globe, Shield, Sparkles, Mail } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      <div className="text-center">
        <h1 className="text-4xl font-bold font-headline tracking-tight">About NoteSwift</h1>
        <p className="text-muted-foreground mt-2">Information about NoteSwift Private Limited, platform governance, and terms of service.</p>
      </div>

      <Card className="shadow-md border-primary/20">
        <CardHeader className="items-center text-center py-8">
          <div className="relative p-2 rounded-2xl bg-white shadow-md border">
            <Image 
              src="/assets/logo.png" 
              alt="NoteSwift Logo"
              width={120}
              height={120}
              className="object-contain"
              priority
            />
          </div>
          <CardTitle className="text-3xl font-headline mt-4">NoteSwift Private Limited</CardTitle>
          <CardDescription className="text-base max-w-xl">
            Empowering Modern Digital Education &amp; Accessible Learning Solutions Across Nepal.
          </CardDescription>
          <div className="flex justify-center items-center gap-4 pt-4">
            <Link 
              href="https://github.com/NoteSwiftNepal" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-md hover:bg-muted"
            >
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </Link>
            <Link 
              href="mailto:contact@noteswift.com" 
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-md hover:bg-muted"
            >
              <Mail className="w-4 h-4" />
              <span>Contact Support</span>
            </Link>
          </div>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-primary" />
              Software Ownership &amp; Rights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This software, <strong>NoteSwift Administration Portal</strong>, is the proprietary product and intellectual property of <strong>NoteSwift Private Limited</strong>. 
              It is designed and maintained exclusively for authorized administrators, academic partners, and staff to manage courses, students, teachers, content delivery, and institutional operations.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-primary" />
              Terms of Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              By accessing and using the NoteSwift Admin panel, you agree to adhere strictly to NoteSwift Private Limited administrative protocols. 
              Unauthorized access, extraction of proprietary curriculum materials, or unapproved data distribution is strictly prohibited and subject to account termination and legal action.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Data Governance &amp; Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              NoteSwift Private Limited is committed to the highest standards of data security and student privacy. 
              All student records, course enrollments, institutional records, and transaction logs are securely stored and encrypted. 
              Administrative actions within this portal are logged for compliance, auditing, and platform security. 
              No platform data is shared with third parties without explicit organizational authorization.
            </p>
          </CardContent>
        </Card>
      </div>

      <footer className="mt-8 text-center text-xs text-muted-foreground pb-4">
        © {new Date().getFullYear()} NoteSwift Private Limited — All rights reserved.
      </footer>
    </div>
  );
}

