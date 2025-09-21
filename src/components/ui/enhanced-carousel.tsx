import * as React from "react"
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import Autoplay from 'embla-carousel-autoplay'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

interface EnhancedCarouselProps {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
  autoplay?: boolean
  autoplayDelay?: number
  pauseOnHover?: boolean
  dragFree?: boolean
  skipSnaps?: boolean
  containScroll?: "trimSnaps" | "keepSnaps" | ""
}

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: ReturnType<typeof useEmblaCarousel>[1]
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
  scrollProgress: number
} & EnhancedCarouselProps

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useEnhancedCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error("useEnhancedCarousel must be used within a <EnhancedCarousel />")
  }

  return context
}

const EnhancedCarousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & EnhancedCarouselProps
>(
  (
    {
      orientation = "horizontal",
      opts,
      setApi,
      plugins,
      autoplay = false,
      autoplayDelay = 4000,
      pauseOnHover = true,
      dragFree = false,
      skipSnaps = false,
      containScroll = "trimSnaps",
      className,
      children,
      ...props
    },
    ref
  ) => {
    // Configure autoplay plugin
    const autoplayPlugin = React.useRef(
      autoplay ? Autoplay({ delay: autoplayDelay, stopOnInteraction: false, stopOnMouseEnter: pauseOnHover }) : null
    )

    const carouselPlugins = React.useMemo(() => {
      const pluginList = plugins ? [...plugins] : []
      if (autoplayPlugin.current) {
        pluginList.push(autoplayPlugin.current)
      }
      return pluginList
    }, [plugins])

    const enhancedOptions = React.useMemo(() => ({
      ...opts,
      axis: orientation === "horizontal" ? "x" : "y",
      dragFree,
      skipSnaps,
      containScroll,
    }), [opts, orientation, dragFree, skipSnaps, containScroll])

    const [carouselRef, api] = useEmblaCarousel(
      enhancedOptions,
      carouselPlugins
    )
    
    const [canScrollPrev, setCanScrollPrev] = React.useState(false)
    const [canScrollNext, setCanScrollNext] = React.useState(false)
    const [scrollProgress, setScrollProgress] = React.useState(0)

    const onSelect = React.useCallback((api: CarouselApi) => {
      if (!api) {
        return
      }

      setCanScrollPrev(api.canScrollPrev())
      setCanScrollNext(api.canScrollNext())
      
      // Calculate scroll progress
      const progress = Math.max(0, Math.min(1, api.scrollProgress()))
      setScrollProgress(progress)
    }, [])

    const scrollPrev = React.useCallback(() => {
      api?.scrollPrev()
    }, [api])

    const scrollNext = React.useCallback(() => {
      api?.scrollNext()
    }, [api])

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault()
          scrollPrev()
        } else if (event.key === "ArrowRight") {
          event.preventDefault()
          scrollNext()
        }
      },
      [scrollPrev, scrollNext]
    )

    React.useEffect(() => {
      if (!api || !setApi) {
        return
      }

      setApi(api)
    }, [api, setApi])

    React.useEffect(() => {
      if (!api) {
        return
      }

      onSelect(api)
      api.on("reInit", onSelect)
      api.on("select", onSelect)
      api.on("scroll", onSelect)

      return () => {
        api?.off("select", onSelect)
        api?.off("scroll", onSelect)
      }
    }, [api, onSelect])

    return (
      <CarouselContext.Provider
        value={{
          carouselRef,
          api: api,
          opts: enhancedOptions,
          orientation:
            orientation || (enhancedOptions?.axis === "y" ? "vertical" : "horizontal"),
          scrollPrev,
          scrollNext,
          canScrollPrev,
          canScrollNext,
          scrollProgress,
          autoplay,
          autoplayDelay,
          pauseOnHover,
          dragFree,
          skipSnaps,
          containScroll,
        }}
      >
        <div
          ref={ref}
          onKeyDownCapture={handleKeyDown}
          className={cn("relative carousel-enhanced", className)}
          role="region"
          aria-roledescription="carousel"
          {...props}
        >
          {children}
        </div>
      </CarouselContext.Provider>
    )
  }
)
EnhancedCarousel.displayName = "EnhancedCarousel"

const EnhancedCarouselContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { carouselRef, orientation } = useEnhancedCarousel()

  return (
    <div ref={carouselRef} className="overflow-hidden momentum-scroll">
      <div
        ref={ref}
        className={cn(
          "flex will-change-transform",
          orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
          className
        )}
        {...props}
      />
    </div>
  )
})
EnhancedCarouselContent.displayName = "EnhancedCarouselContent"

const EnhancedCarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { orientation } = useEnhancedCarousel()

  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="slide"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className
      )}
      {...props}
    />
  )
})
EnhancedCarouselItem.displayName = "EnhancedCarouselItem"

const EnhancedCarouselPrevious = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollPrev, canScrollPrev } = useEnhancedCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute h-8 w-8 rounded-full hover-glow-primary transition-glow z-10",
        orientation === "horizontal"
          ? "-left-12 top-1/2 -translate-y-1/2"
          : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
})
EnhancedCarouselPrevious.displayName = "EnhancedCarouselPrevious"

const EnhancedCarouselNext = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollNext, canScrollNext } = useEnhancedCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute h-8 w-8 rounded-full hover-glow-primary transition-glow z-10",
        orientation === "horizontal"
          ? "-right-12 top-1/2 -translate-y-1/2"
          : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ArrowRight className="h-4 w-4" />
      <span className="sr-only">Next slide</span>
    </Button>
  )
})
EnhancedCarouselNext.displayName = "EnhancedCarouselNext"

// Progress indicator component
const EnhancedCarouselProgress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { scrollProgress } = useEnhancedCarousel()

  return (
    <div
      ref={ref}
      className={cn("relative h-2 w-full bg-muted rounded-full overflow-hidden", className)}
      {...props}
    >
      <div
        className="h-full bg-primary transition-all duration-300 ease-out glow-primary"
        style={{ width: `${scrollProgress * 100}%` }}
      />
    </div>
  )
})
EnhancedCarouselProgress.displayName = "EnhancedCarouselProgress"

// Dots indicator component
const EnhancedCarouselDots = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    slideCount?: number
  }
>(({ className, slideCount, ...props }, ref) => {
  const { api } = useEnhancedCarousel()
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [scrollSnaps, setScrollSnaps] = React.useState<number[]>([])

  React.useEffect(() => {
    if (!api) return

    setScrollSnaps(api.scrollSnapList())
    setSelectedIndex(api.selectedScrollSnap())

    api.on("select", () => {
      setSelectedIndex(api.selectedScrollSnap())
    })
  }, [api])

  const scrollTo = React.useCallback(
    (index: number) => api && api.scrollTo(index),
    [api]
  )

  return (
    <div
      ref={ref}
      className={cn("flex gap-2 justify-center mt-4", className)}
      {...props}
    >
      {scrollSnaps.map((_, index) => (
        <button
          key={index}
          className={cn(
            "w-3 h-3 rounded-full transition-all duration-300",
            index === selectedIndex
              ? "bg-primary glow-primary"
              : "bg-muted hover:bg-muted-foreground/50 hover-glow-primary"
          )}
          onClick={() => scrollTo(index)}
          aria-label={`Go to slide ${index + 1}`}
        />
      ))}
    </div>
  )
})
EnhancedCarouselDots.displayName = "EnhancedCarouselDots"

export {
  type CarouselApi,
  EnhancedCarousel,
  EnhancedCarouselContent,
  EnhancedCarouselItem,
  EnhancedCarouselPrevious,
  EnhancedCarouselNext,
  EnhancedCarouselProgress,
  EnhancedCarouselDots,
  useEnhancedCarousel,
}