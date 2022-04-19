using Pulumi;
using Pulumi.Awsx;

class MyStack : Stack
{
    public MyStack()
    {
        var trail = new Awsx.Cloudtrail.Trail("dotnet-trail", new TrailArgs
        {
            EnableLogging = true,
        });
    }
}
