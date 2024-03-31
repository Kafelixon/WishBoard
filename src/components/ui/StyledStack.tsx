// StyledStack.tsx
interface StyledStackProps {
  children: React.ReactNode;
}

const StyledStack = (props: StyledStackProps) => (
  <div
    className="flex flex-col sm:flex-row space-y-1 sm:space-x-2 md:space-x-4 pt-7 mx-5 sm:mx-20 md:mx-50 pt:mx-100 justify-center items-center mt-12 mb-6 max-w-[80vw]"
  >
    {props.children}
  </div>
);

export default StyledStack;
