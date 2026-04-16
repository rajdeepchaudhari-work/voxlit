import Nav from './components/Nav'
import Hero from './components/Hero'
import TrustBar from './components/TrustBar'
import VoxlitCloudPush from './components/VoxlitCloudPush'
import AppLogoStrip from './components/AppLogoStrip'
import FeatureGrid from './components/FeatureGrid'
import HowItWorks from './components/HowItWorks'
import FromTheMaker from './components/FromTheMaker'
import ComparisonTable from './components/ComparisonTable'
import FAQ from './components/FAQ'
import InstallGuide from './components/InstallGuide'
import DownloadCTA from './components/DownloadCTA'
import Footer from './components/Footer'

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <TrustBar />
        <VoxlitCloudPush />
        <AppLogoStrip />
        <FeatureGrid />
        <HowItWorks />
        <FromTheMaker />
        <ComparisonTable />
        <FAQ />
        <InstallGuide />
        <DownloadCTA />
      </main>
      <Footer />
    </>
  )
}
